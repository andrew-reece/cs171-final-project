//////////////////////////////////////////////////////////////////////////////////////
//
// 	CS171: Final Project
//  Group: Brian Feeny, Andrew Reece, Jennifer Sulkow
//
//  Page: Main page
//
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
//
// 				GLOBAL VARIABLES
//
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////

// for now, everything is comdata - at some point this variable will change based on 
// which time series data user has selected

	var ts_type = "-comdata"
	
// initialize global svg var
	var svg

// master variable holds subj var data, labels holds axis labels
	var master_vardata, master_labels
	
// force-directed graph objects
	var nodes = {}, links = []
	var path, circle, text
	
// default node radius
	var r = 6
	
// keys array holds column names for time series data
	var keys = []
	
// useful global for time series object manipulation
	var numkeys
	
// graph dimensions
	var width = 790, height = 575
	
// linear color gradient scale from HW1
// NB: this is for coloring the edge weights in the force graph that go above threshold
// 		but that's kind of ugly - we should get rid of that.
	var color = d3.scale.linear()
				  .domain([5, 40])
				  .interpolate(d3.interpolateRgb)
				  .range(["#fee0d2", "#de2d26"]) // light-dark red via colorbrewer2.org
				  
// for setting edgeScale domain, based on max frequency ct for time series variable
	var freqmax = 0
	
// translates time series frequency counts into edge weights
	var edgeScale = d3.scale.linear().range([0,40])
		
// initialize heatmap vars, specs
	var hmap_data, heatmap, hmdata, hmap_xaxis, hmap_yaxis, hm
	var grid_ct = 0
	var heatmap_colors = { low:"#deebf7", med:"#9ecae1", high:"#3182bd", vhigh:"#08519c" };
	
// these margin values are all kind of arbitrary - clean up a bit?  HARD CODE
	var hm_margin = {top: 15, right: 80, bottom: 30, left: 0},
		hm_width = 350 - hm_margin.left - hm_margin.right,
		hm_height = 330 - hm_margin.top - hm_margin.bottom;
		
/* heatmap color scale
	uses 4 range points, interpolates between these points
	points are hard-coded - better to compute these dynamically based on dataset
HARD CODE */
	var heatmapColorScale = d3.scale.linear()
		 .domain([0, .2, .5, 2.5])
		  .interpolate(d3.interpolateRgb)
		  .range([heatmap_colors.low, heatmap_colors.med, heatmap_colors.high, heatmap_colors.vhigh])

// define heatmap svg
	var hmap_area = setHmapArea(d3.select("#heatmap").append("svg"))

// set heatmap scale parameters		HARD CODE (translate x vals)
	var hmap_x = setAxis("x", hmap_area, 30, 0)
	var hmap_y = setAxis("y", hmap_area, 60, hm_margin.top)

// default heatmap name is libcon (political scale)
// DO WE STILL NEED THIS?
	var heatmap_name = "libcon"	

// default time series data is communications data		
	var file = "data/com-pairs.csv"

// initialize scales for heatmap window
	var x = d3.scale.ordinal()
	var y = d3.scale.ordinal()
	var yAxis = d3.svg.axis().scale(y).orient("left")
	var xAxis = d3.svg.axis().scale(x).orient("bottom")
	var tab_toggle = false
	var current_graph = "force-tab" // page loads with force layout

	var datebox = d3.select("#date").append("text")
					 .attr("class", "date-box")
					 .attr("transform", "translate(100,90)")

// set index for elapse function
// this is the column at which it should start drawing from time series dataset
  var elapse_seed = 4
	
// date parser
  var YmdXParser = d3.time.format("%Y-%m-%d").parse;

// time scale
  var timeScale = d3.scale.quantize();

// range for our timeScale
  var dateRange = [];

// reference to our slider
  var slider = d3.select("#date-filter");

// notice box for testing only
	var notice = d3.select("#notice")
//////////////////////////////////////////////////////////////////////////////////////
//      END GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//      STARTUP
//		* these functions get things going
//////////////////////////////////////////////////////////////////////////////////////

	setTabEvents()	
	getData() // this feeds into renderPage()

//////////////////////////////////////////////////////////////////////////////////////
//      END STARTUP
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
//
//      MAIN FUNCTIONS
//		* these are the workhorses
//
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: getData()
// Purpose:  1. gets variable meta-data
//			 2. feeder function to renderPage(), the main function for this page
//
//////////////////////////////////////////////////////////////////////////////////////

function getData() {
	var path = "data/variables.json"
	d3.json(path, function(error, data) { master_vardata = data; getAxisLabels(); })
}

function getAxisLabels() {
	var path = "data/type-key.json"
	d3.json(path, function(error,data) { master_labels = data; renderPage(master_vardata); })
}
//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: elapse(thiskey)
// Purpose:  runs time series animation
//
//////////////////////////////////////////////////////////////////////////////////////


function elapse(thiskey, animation) {

  //console.log("thiskey:", thiskey);
	path.transition()
		.duration(300)
		.style("stroke-width", function(d) {
			var weight = edgeScale(d[keys[thiskey]])
			if (weight >= 5) {
				d3.select(this).style("stroke",color(weight))
			}
			return weight

		})
	datebox.html(function() {
		var thisdate = (thiskey<(keys.length-1)) ? keys[thiskey].substr(0) : "July 2009 [end of study]"
		return thisdate
		})
		
	if(heatmap) {
		heatmap
		.style("fill", function(d) { 
			return heatmapColorScale(d[keys[thiskey]]); });
	}
	if (animation) {
	  	slider.property("value", thiskey);

		svg.transition()
			.duration(300)
			.each("end", function() {
				thiskey++
				return (thiskey <= numkeys) 
					? elapse(thiskey,true) 
					: end()
			})	
	}
}



//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderPage(vardata)
// Purpose:  workhorse function for entire page
//
//////////////////////////////////////////////////////////////////////////////////////
	   
function renderPage(vardata) {
	
	makeHeatmapDropdown(vardata)

	d3.csv(file, function(error, data) {
	
		data.forEach( function(d) { 
			freqmax = (freqmax < parseInt(d.total_freq)) ? parseInt(d.total_freq) : freqmax 
		})
		links = data
		links.forEach(function(link) {
		  link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
		  link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
		});	

		for(var k in data[0]) {
			keys.push(k);
			if(YmdXParser(k)) { dateRange.push(k); }
		}
		
		// The order of object keys is not guaranteed in JS, so we must sort to be absolutely sure.
    dateRange.sort(function(a,b) {
      return new Date(a) - new Date(b);
    })
    
    // create our timeScale
    timeScale.domain([elapse_seed,(elapse_seed + dateRange.length - 1)]).range(dateRange)
    
    // set our slider to correct values
	  slider .attr({'min':elapse_seed, 'max':(elapse_seed + dateRange.length - 1), 'value':elapse_seed})
		   .on("change", function() { return elapse(slider.property("value"),false)})

			   
		numkeys = keys.length
	
		//var colors = d3.scale.category20().domain(floors)

		edgeScale.domain([0,freqmax])

		renderForceGraph()
	})
}

//////////////////////////////////////////////////////////////////////////////////////
//      END MAIN FUNCTIONS
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
//
//       		HELPER FUNCTIONS
//				* listed alphabetically
//
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: buildHeatmap(name, vardata)
// Purpose:  1. gets heatmap data
//			 2. feeds into drawHeatmap()
//
//////////////////////////////////////////////////////////////////////////////////////

function buildHeatmap(name, vardata, location, xoffset, yoffset) {

	console.log(name)
	if (location == "main") {
		hm = { size: 20, h:20, w:20 }
	} else if (location == "focus") {
		hm = { size: 25, h:25, w:25 }
	}
	var hmpath = "data/"+name+ts_type+"-heatmap.csv"
	var entries = d3.entries(vardata.name)
	var var_idx
	entries.forEach( function(x) {
		if (x.value == name) { var_idx = x.key }
	})
	var var_names = vardata.var_range[var_idx]
	var var_range = []
	for (var i = 1; i <= var_names.length; i++) {
		var_range.push(i*hm.size)
		if (i == var_names.length) {
			if (location == "main") {
				var region = setHmapArea(svg, xoffset, yoffset)
				var x_axis = setAxis("x", region, 30, 0)
				var y_axis = setAxis("y", region, 30, 0)
				var axis_offset = 10
				var x_axis_offset = 0
				var y_axis_offset = 0
				var per_rect_x_offset = 5
				var per_rect_y_offset = 0
				var x_axis_offset_multiplier = 5.5
				var axis_labels = d3.values(master_labels[name])
				if (axis_labels.length > 0) {
					xAxis.tickValues(axis_labels)
					yAxis.tickValues(axis_labels)
				} else {
					xAxis.tickValues(null)
					yAxis.tickValues(null)
				}
			} else if (location == "focus") {
				var region = hmap_area
				var x_axis = hmap_x
				var y_axis = hmap_y
				var axis_offset = 20
				var x_axis_offset = 30
				var y_axis_offset = 0
				var per_rect_x_offset = 30
				var per_rect_y_offset = 0
				var x_axis_offset_multiplier = 5.5	
				// write hmap description from file
				d3.select("#heatmap-description").html(function() { return vardata.descrip[var_idx] })
			}
			
			var axis_labels = d3.values(master_labels[name])
			if (axis_labels.length > 0) {
				yAxis.tickValues(axis_labels)
				var temp = axis_labels
				xAxis.tickValues(axis_labels.slice(0).reverse())
			} else {
				yAxis.tickValues(null)
				xAxis.tickValues(null)
			}
			drawHeatmap(vardata, var_names, var_range, var_idx, 
						hmpath, location, region,
						xoffset, yoffset, 
						x_axis_offset, y_axis_offset,
						x_axis_offset_multiplier, axis_offset, 
						x_axis, y_axis, per_rect_x_offset, per_rect_y_offset)
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: changeGraph(obj)
// Purpose:  switches graph views in main graph viewbox
//
//////////////////////////////////////////////////////////////////////////////////////

function changeGraph(obj) {

	clearGraph()
	
	var graph = d3.select(obj).attr("id")
	
	if (graph == "force-tab") {
		changeTab(graph)
		renderForceGraph()
	} else if (graph == "chord-tab") {
		changeTab(graph)
		initSVG(0,0)
		renderChordGraph()
	} else if (graph == "heatmap-tab") {
		grid_ct = 1
		changeTab(graph)
		initSVG(50,40)
		renderAllHeatmaps(master_vardata)
	}
	current_graph = d3.select(obj).attr("id")
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: changeTab(tabname)
// Purpose:  changes appearance of tabs based on which one is currently selected
//
//////////////////////////////////////////////////////////////////////////////////////

function changeTab(tabname) {
	d3.selectAll(".selected").classed("selected", false)
	d3.select("#"+tabname).classed("selected", true)
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: clearGraph()
// Purpose:  clears current graph from viewbox
//
//////////////////////////////////////////////////////////////////////////////////////

function clearGraph() {
	d3.select("#graph-viewbox").remove()
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: clearHeatmap()
// Purpose:  clears out previous heatmap
//
//////////////////////////////////////////////////////////////////////////////////////

function clearHeatmap() {
	d3.selectAll(".heatmap").remove()
	d3.selectAll(".axis-instance").remove()
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: drawHeatmap(vardata, var_names, var_range, hmpath)
// Purpose:  draws heatmap
//
//////////////////////////////////////////////////////////////////////////////////////

function drawHeatmap(vardata, var_names, var_range, var_idx, 
						hmpath, location, region,
						xoffset, yoffset, 
						x_axis_offset, y_axis_offset,
						x_axis_offset_multiplier, axis_offset, 
						x_axis, y_axis, per_rect_x_offset, per_rect_y_offset) {	

	// set hm dimension params
	var map_height = var_names.length*hm.size + axis_offset
	var max_label_length = d3.max(var_names, function(d) {return d.length})
	var x_axis_vert_offset = max_label_length*x_axis_offset_multiplier 

	// define scale domains and ranges
	y.domain(var_names).range(var_range)
	x.domain(var_names.reverse()).range(var_range.reverse())
	if (hmpath == "data/fav_music-comdata-heatmap.csv") {
		console.log('found music')
		console.log(var_names)
		console.log(var_range)
		console.log('domain range')
		console.log(y.domain())
		console.log(y.range())
		console.log('dims')
		console.log('height: '+map_height)
		region.attr("height", map_height)
		console.log('region height: '+region.attr("height"))
	}
	// set axes
	x_axis.attr("height", map_height)
	x_axis.attr("transform", "translate("+x_axis_offset+","+map_height+")")
	
	x_axis.append("g").attr("class", "axis-instance").call(xAxis)
	x_axis.selectAll("text")
		.attr("transform", "translate(0,"+x_axis_vert_offset+")rotate(-90)")		
	y_axis.append("g").attr("class", "axis-instance").call(yAxis)	
	
	// get hmap data
	d3.csv(hmpath, function(error, data2) {
		var hmap_data2 = data2
		// draw map	
		console.log(map_height)
		heatmap = region.selectAll(".heatmap")
			.data(data2)
			 .enter()
			 .append("rect")
				.attr("class", "heatmap")
				.attr("x", function(d) { 
					var val = d.pairs.split("-")[0]
					return x(val); })
				.attr("y", function(d) { 
					var val = d.pairs.split("-")[1]
					return y(val); })
				.attr("width", function(d)  { return hm.w })
				.attr("height", function(d) { return hm.h })
				.attr("transform", "translate("+per_rect_x_offset+","+per_rect_y_offset+")")
				.style("stroke-width", "1px")
				.style("stroke", "black")
				.style("fill", function(d) { 
					var first_entry = d3.entries(data2[0])[2].key
					return heatmapColorScale(d[first_entry])
				})
				.on("mouseover", function(d) {
					notice.text(d.pairs.split("-")[0]+ ' and '+ d.pairs.split("-")[1])
				})
				.on("mouseout", notice.text(""))
	})
}
//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: end()
// Purpose:  1. closes out animation
//			 2. prints final tally for heatmap
//
//////////////////////////////////////////////////////////////////////////////////////

function end() {
	if(heatmap) { heatmap.style("fill", 
				  function(d) { 
					return heatmapColorScale(d["total"]) 
				  })
	}
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: highlightTab(obj)
// Purpose:  highlights tab on hover
//
//////////////////////////////////////////////////////////////////////////////////////

function highlightTab(obj) {
	var hover = d3.select(obj).classed("tab-hover")
	//console.log(col)
	d3.select(obj).classed("tab-hover", function() { return (hover) ? false : true })
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: initSVG()
// Purpose:  creates SVG for main graph region
//
//////////////////////////////////////////////////////////////////////////////////////

function initSVG(x_offset, y_offset) {

	svg = d3.select("#graph").append("svg")
			.attr("id", "graph-viewbox")
			.attr("width", width)
			.attr("height", height)
			.append("g")
			.attr("transform", "translate("+x_offset+","+y_offset+")")
			.attr("width", width)
			.attr("height", height)
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: linkArc(d)
// Purpose:  draws edges in force layout
//
//////////////////////////////////////////////////////////////////////////////////////

	function linkArc(d) {
	  var dx = d.target.x - d.source.x,
		  dy = d.target.y - d.source.y,
		  dr = Math.sqrt(dx * dx + dy * dy);
	  return "M" + 
			 d.source.x + "," + d.source.y + "A" + 
			 dr + "," + dr + " 0 0,1 " + 
			 d.target.x + "," + d.target.y;
	}
	
//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: makeHeatmapDropdown(vardata)
// Purpose:  draws and populates heatmap dropdown box in control panel
//
//////////////////////////////////////////////////////////////////////////////////////

function makeHeatmapDropdown(vardata) {
	d3.select("#heatmap-dropdown")
			.on("change", function() { 
					heatmap_name = d3.select(this).property("value")
					clearHeatmap()
					var location = "focus"
					buildHeatmap(heatmap_name, vardata, location)
				})
	var select = document.getElementById("heatmap-dropdown")
	
	for (var i = 0; i < d3.entries(vardata.name).length; i++) {
		var option = document.createElement("option")
		option.text = vardata.nickname[i]
		option.value = vardata.name[i]
		select.add(option)
	}
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderAllHeatmaps()
// Purpose:  draws all heatmaps for main viewbox
//
//////////////////////////////////////////////////////////////////////////////////////

function renderAllHeatmaps(vardata) {

	var location = "main"
	svg.selectAll(".hmap-grid")
		.data(d3.values(vardata.name))
		.enter()
		.append("g")
			.attr("class", "hmap-grid")
			.each(function(d,i) {
				var multiplier_x = [0, 1, 2, 0, 1, 2]
				var multiplier_y = [0, 0, 0, 1, 1, 1]
				var xoffset = multiplier_x[i]*250
				var yoffset = multiplier_y[i]*230
				return buildHeatmap(d, vardata, location, xoffset, yoffset) 
			})
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderChordGraph()
// Purpose:  draws chord graph for main viewbox
//
//////////////////////////////////////////////////////////////////////////////////////

function renderChordGraph() {
	svg.append("image")
		.attr("transform", "translate(20,10)")
		.attr("width", 750)
		.attr("height", 550)
		.attr("xlink:href","chord.png")
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderForceGraph()
// Purpose:  draws force-directed graph
//
//////////////////////////////////////////////////////////////////////////////////////

function renderForceGraph() {	
	var force = d3.layout.force()
		.nodes(d3.values(nodes))
		.links(links)
		.size([width, height])
		.linkDistance(400)
		.charge(-50)
		.friction(.2)
		.gravity(.3)
		.on("tick", tick)
		.start();

	initSVG(0,0)

	path = svg.append("g").selectAll("path")
		.data(force.links())
	  .enter().append("path")
		.attr("class", "link")
		.style("stroke-width", function(d) {
			return edgeScale(d[keys[4]]) // check hard-coding here HARD CODE
		});
		
	circle = svg.append("g").selectAll("circle")
		.data(force.nodes())
	  .enter().append("circle")
		.attr("r", r)
		.style("fill", function(d) {return "steelblue"})
		.call(force.drag);

	text = svg.append("g").selectAll("text")
		.data(force.nodes())
		.enter()
		.append("text")
			.attr("x", 12)
			.attr("y", 3)
			.style("font-size", "12pt")
			.text(function(d) { return d.name; });
}
	
//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: setAxis
// Purpose:  define x/y for the g that contains an axis
//
//////////////////////////////////////////////////////////////////////////////////////

function setAxis(dim, location, xoffset, yoffset) {
	
	var axis = location.append("g")
						.attr("class", dim+"-axis")
						.attr("transform", "translate("+xoffset+","+yoffset+")")
	return axis
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: setHmapArea(container)
// Purpose:  define hmap area
//
//////////////////////////////////////////////////////////////////////////////////////

function setHmapArea(container, x_offset, y_offset) {
	
	x_offset = (typeof x_offset === "undefined") ? 0 : x_offset
	y_offset = (typeof y_offset === "undefined") ? 0 : y_offset
	grid_ct++
	var area = container.attr("width", hm_width + hm_margin.left + hm_margin.right)
						.attr("height", hm_height + hm_margin.top + hm_margin.bottom)
						.append("g")
						.attr("id", "svg-"+grid_ct)
						.attr("transform", "translate("+x_offset+","+y_offset+")")
	return area
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: setTabEvents
// Purpose:  sets interactive mouse events for graph tabs
//
//////////////////////////////////////////////////////////////////////////////////////

function setTabEvents() {

	d3.selectAll(".tab")
		.on("click", function() { 
			if (!(current_graph == d3.select(this).attr("id"))) { return changeGraph(this) }
		})
		.on("mouseover", function() { return highlightTab(this) })	
		.on("mouseout", function()  { return highlightTab(this) })	
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: tick()
// Purpose:  positions nodes and draws edges for force layout
//
//////////////////////////////////////////////////////////////////////////////////////

	function tick() {
	  path.attr("d", linkArc);
	  // r+10 b/c that keeps the numbers of nodes near the viewbox border from getting cut off
	  // if it's just "r" then the node names (i.e. numbers) can float out of view
	  circle .attr("cx", function(d) { return d.x = Math.max((r+15), Math.min(width - (r+15), d.x)); })
			 .attr("cy", function(d) { return d.y = Math.max((r+15), Math.min(height - (r+15), d.y)); });
	  text.attr("transform", transform);
	}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: transform(d)
// Purpose:  helper function for force layout, orients node text
//
//////////////////////////////////////////////////////////////////////////////////////

	function transform(d) {
	  return "translate(" + d.x + "," + d.y + ")";
	}
	
//////////////////////////////////////////////////////////////////////////////////////
//      END HELPER FUNCTIONS
//////////////////////////////////////////////////////////////////////////////////////
