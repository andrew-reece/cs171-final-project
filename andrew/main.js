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

////////////////////////////////////////////////////////
//
//
// 	ONLY CHANGE THIS ts VARIABLE TO SWITCH TIME SERIES BETWEEN com & prox
//
	var ts = "com" // switch to "prox" for proxdata
//
//
////////////////////////////////////////////////////////
	
	var ts_type = "-"+ts+"data"	
	var ts_filename = "data/"+ts+"-pairs.csv"
		
// initialize global svg var
	var svg

// master vars hold persistent user/variable data after load via csv/json
	var master_vardata, master_subjects, master_labels
	
// force-directed graph objects
	var nodes = {}, links = []
	var path, circle, text
	
// default node radius
	var r = 6
	
// keys array holds column names for time series data
	var keys = []
	
// useful global for time series object manipulation (aka i don't remember what it does)
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

// initialize scales for heatmap window
	var x = d3.scale.ordinal()
	var y = d3.scale.ordinal()
	var yAxis = d3.svg.axis().scale(y).orient("left")
	var xAxis = d3.svg.axis().scale(x).orient("bottom")
	var tab_toggle = false
	var current_graph = "force-tab" // page loads with force layout

// init output boxes for right-hand panels
	var datebox = d3.select("#date").append("text")
					 .attr("class", "date-box")
					 .attr("transform", "translate(100,90)")

	var deetbox = d3.select("#details-box")
	
	var filterbox = d3.select("#filter-box")
	
// init array holding current filtered-out variables
	var filtered = []
	
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
	
// an array to store each heatmap so it can be referenced later
  var heatMapArray = [];

// notice box for testing only
	var notice = d3.select("#notice")
//////////////////////////////////////////////////////////////////////////////////////
//      END GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//      STARTUP
//		* these functions get things going
//////////////////////////////////////////////////////////////////////////////////////

	setTabEvents() // sets up tab behavior for main graph viewport
	getVarData() // this feeds into renderPage()

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
// FUNCTION: getVarData() & getSubjectData() & getAxisLabels()
// Purpose:  1. gets variable meta-data
//			 2. feeder function to renderPage(), the main function for this page
//
//////////////////////////////////////////////////////////////////////////////////////

function getVarData() {
	var fpath = "data/variables.json"
	d3.json(fpath, function(error, data) { master_vardata = data; getSubjectData(); })
}

function getSubjectData() {
	var fpath = "data/subjects-master.csv"
	d3.csv(fpath, function(error, data) { master_subjects = data; getAxisLabels(); })
}

function getAxisLabels() {
	var fpath = "data/type-key.json"
	d3.json(fpath, function(error,data) { master_labels = data; renderPage(master_vardata); })
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

// updates date in datebox
	datebox.html(function() {
		var thisdate = (thiskey<(keys.length-1)) ? keys[thiskey].substr(0) : "July 2009 [end of study]"
		return thisdate
		})

// if single pane heatmap is selected, this updates heatmap based on time series	
	if(heatmap) {
	  for(var hm in heatMapArray) {
	   // console.log("heatmap:", heatMapArray[hm]);
		  heatMapArray[hm].style("fill", function(d) { 
			  return heatmapColorScale(d[keys[thiskey]]); 
		  });
    }
  }
// if time series is selected as animation (rather than discrete intervals on slider),
// this triggers recursion that runs until time is exhausted
	if (animation) {
	  	slider.property("value", thiskey)
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
	
// creates options of heatmap <select> element in control panel, based on vardata
	makeHeatmapDropdown(vardata)

// reads time series data, assigns node/link info for force graph
	d3.csv(ts_filename, function(error, data) {
	
	// we need an upper bound for frequency count across our entire time series
	// this lets us set the range for the scale that creates edge weights in force graph
	// so this loop just keeps track of the highest frequency count in our dataset
		data.forEach( function(d) { 
			freqmax = (freqmax < parseInt(d.total_freq)) ? parseInt(d.total_freq) : freqmax 
		})
		links = data
		
	// this is node graph mumbo from a bostock page - i used it in HW2. 
	// i don't remember where it's from.
	
		links.forEach(function(link) {
		  link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
		  link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
		});	

// 
// CREATE TIME SLIDER
//
	// i think this is for the time slider that brian installed.  
	// looks like it keeps track of time series checkpoints in an array
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
	  slider.attr({	
	  				'min':elapse_seed, 
	  				'max':(elapse_seed + dateRange.length - 1), 
	  				'value':elapse_seed
	  			 })
		   	.on("change", function() { return elapse(slider.property("value"),false)})
//
// END TIME SLIDER
//
		// i don't remember what numkeys is for, but it's a global we need elsewhere.
		numkeys = keys.length

		// set domain for edge weight scale, based on freqmax (see top of this function)
		edgeScale.domain([0,freqmax])

		// draw actual force layout
		renderForceGraph()
		
	}) // end d3.csv()
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

// hm dims differ based on whether drawn in main or focus box
// NB: size/h/w are all the same for now...may just be easier to make one value

	if (location == "main") {
		hm = { size: 20, h:20, w:20 }
	} else if (location == "focus") {
		hm = { size: 15, h:15, w:15 }
	}
	
// filename for heatmap data
// name: 	actual variable name ("libcon", "fav_music", etc)
// ts_type:	time series type ("com" or "prox")
	
	var hmpath = "data/"+name+ts_type+"-heatmap.csv"
	
// vardata holds the variable metadata from variables.json
// we need the numeric index of the variable we're interested in
// vardata has our var names stored as values in key:val pairs, with keys as numbers

// it's crude, but below we use d3.entries (which makes key:val pairs from an object)
// and loops through looking for a val that matches 'name'.  

	var entries = d3.entries(vardata.name)
	var var_idx
	
	entries.forEach( function(x) {
	
		// if found, it saves its corresponding key into 'var_idx'.  
		if (x.value == name) { var_idx = x.key }
	})
	
// then we can use var_idx to identify the range in vardata.var_range that we want. 
 
	var var_names = vardata.var_range[var_idx]

// this gives us the range of pairwise entries for a given variable (ie. lib1-con2, lib2-con3, etc).  
	
// we then use that range to construct the actual scale .range() array for the
// heatmap.  that's what this for loop does.  

	var var_range = []
	for (var i = 1; i <= var_names.length; i++) {
	
	// for each 'i', multiply by the size of one heatmap cell rect, then push to range array
		var_range.push(i*hm.size)

// at the end of the loop (i==var_names.length) we set the relevant values 
// based on whether we're rendering in main or focus, and then
// call the drawHeatmap() function, which actually renders the heatmap grid.
		
		if (i == var_names.length) {
			var region = (location == "main") // implicitly, 'if else location=="focus"'
						? setHmapArea(svg, xoffset, yoffset)
						: hmap_area
			var x_axis = (location == "main") 
						? setAxis("x", region, 30, 0)
						: hmap_x
			var y_axis = (location == "main")
						? setAxis("y", region, 30, 0)
						: hmap_y
			var offset = (location == "main")
						? {h:10, x:0,  y:0, rect: {x:5, y:0},   multiplier:{x:5.5,y:0}}
						: {h:10, x:37, y:-10, rect: {x:40,y:0}, multiplier:{x:2.5,y:0}}

			if (location == "focus") {
				// write hmap description from file
				d3.select("#heatmap-description").html(function() { return vardata.descrip[var_idx] })
			}
			
		// axes will take array values as tick labels unless otherwise specified
		// but we kept categorical array values in generic form during munging
		// ie. TYPE1 instead of LIB1 or FRESHMAN.  
		// we have 'type-key.csv' which contains the key codes to map meaningful
		// values to each generic value for every variable
		// master_labels is an object with these key codes - here we map these values
		// onto the d3 axis tickValues so the graph displays them instead of generics
		
			var axis_labels = d3.values(master_labels[name])
			
		// if array len = 0, that means there's no need to map, the originals are
		// the actual values (true for sad, stressed, and exercise hrs)
		
			if (axis_labels.length > 0) {
			
				yAxis.tickValues(axis_labels)
				
				// .slice(0) copies array before reversing
				// otherwise .reverse() reverses the original array, too
				xAxis.tickValues(axis_labels.slice(0).reverse())
				
			} else { // tickValues(null) takes array values as ticks
			
			// we want null arg for sad, stressed, etc, where ticks and values are equal
				yAxis.tickValues(null)
				xAxis.tickValues(null)
			}
			
		// call drawHeatmap function, which actually renders the heatmap
		
			drawHeatmap(vardata, var_names, var_range, var_idx, 
						hmpath, location, region, x_axis, y_axis, offset)
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

// first get rid of whatever was there before
	clearGraph()

// define graph object	
	var graph = d3.select(obj).attr("id")

// render whatever graph type is selected
//	changeTab() updates tab appearances based on 'obj' parameter (which IDs the selected tab)
// 	initSVG() re-draws the foundation svg for the graph
//  (initSVG() is not called for force b/c it's embedded in renderForceGraph()
//	(needs to be this way since renderForceGraph is called on pageload)
// 	render[Whatever]() starts the drawing process 	
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
// global var we call on elsewhere
	current_graph = graph
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: changeTab(tabname)
// Purpose:  changes appearance of tabs based on which one is currently selected
//
//////////////////////////////////////////////////////////////////////////////////////

function changeTab(tabname) {

// see main.css for more - basically changes color and borders
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
// FUNCTION: clearNetworkDetails()
// Purpose:  clears out network details pane
//
//////////////////////////////////////////////////////////////////////////////////////

function clearNetworkDetails() {
	deetbox.html("")
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: drawHeatmap(vardata, var_names, var_range, hmpath)
// Purpose:  draws heatmap
//
//////////////////////////////////////////////////////////////////////////////////////

function drawHeatmap(vardata, var_names, var_range, var_idx, 
					 hmpath, location, region, x_axis, y_axis, offset) {	

	// set hm dimension params
	var map_height = var_names.length * hm.size + offset.h
	var max_label_length = d3.max(var_names, function(d) {return d.length})
	var x_axis_vert_offset = max_label_length * offset.multiplier.x 

	// define scale domains and ranges
	y.domain(var_names).range(var_range)
	x.domain(var_names.reverse()).range(var_range.reverse())

/*
	// for testing only
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
*/

	// set axes
	x_axis.attr("height", map_height)
	x_axis.attr("transform", "translate("+offset.x+","+map_height+")")
	
	x_axis.append("g").attr("class", "axis-instance").call(xAxis)
	x_axis.selectAll("text")
		.style("text-anchor", "end")
		.attr("transform", "translate(0,"+x_axis_vert_offset+")rotate(-90)")		
	y_axis.append("g").attr("class", "axis-instance").call(yAxis)	
	
	// get hmap data
	d3.csv(hmpath, function(error, data) {
		// draw map	
		heatmap = region.selectAll(".heatmap")
			.data(data)
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
				.attr("transform", "translate("+offset.rect.x+","+offset.rect.y+")")
				.style("stroke-width", "1px")
				.style("stroke", "black")
				.style("fill", function(d) { 
				// needs to be [2] here because first two columns are index/label cols
					var first_entry = d3.entries(data[0])[2].key
					return heatmapColorScale(d[first_entry])
				})
			//
			// for testing only - shows cell pairwise values in notice box (upper right)
			//
				.on("mouseover", function(d) {
					notice.text(d.pairs.split("-")[0]+ ' and '+ d.pairs.split("-")[1])
				})
				.on("mouseout", function() {notice.text("")})
				heatMapArray.push(heatmap);
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
		.attr("xlink:href","images/chord.png")
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

	setFilters(force.nodes())
	
	path = svg.append("g").selectAll("path")
		.data(force.links())
	  .enter().append("path")
		.attr("class", "link")
		.style("stroke-width", function(d) {
			return edgeScale(d[keys[4]]) // check hard-coding here HARD CODE
		})
		.on("mouseover", function(d) {
			d3.select(this).style("stroke", "purple")
			setNetworkDetails(d,true) 
		})
		.on("mouseout", function(d) {
			d3.select(this).style("stroke", "#666")
			clearNetworkDetails()
		})
		
	circle = svg.append("g").selectAll("circle")
		.data(force.nodes())
	  .enter().append("circle")
	  	.attr("id", function(d) {return "id"+d.name})
		.attr("r", r)
		.style("fill", function(d) {return "steelblue"})
		.on("mouseover", function(d) {
			d3.select(this).style("fill", "purple")
			setNetworkDetails(d,false) 
		})
		.on("mouseout", function(d) {
			d3.select(this).style("fill", "steelblue")
			clearNetworkDetails()
		})
		.call(force.drag);

	text = svg.append("g").selectAll("text")
		.data(force.nodes())
		.enter()
		.append("text")
			.attr("id", function(d) {return "txt"+d.name})
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
// FUNCTION: setFilters
// Purpose:  sets node filtering via filter checkboxes
//
//////////////////////////////////////////////////////////////////////////////////////

function setFilters(nodedata) {
	
	d3.selectAll(".filter")
		.on("change", function() {
			var selected =d3.select(this).property("checked")
			var filname = d3.select(this).attr("name")
			var filval  = d3.select(this).attr("value")
			var thisfilter = filname+"-"+filval
			for (var i = 0; i < master_subjects.length; i++) {
				if (mapLabel(master_subjects[i][filname], filname) == filval) {
					if (selected) {
						d3.select("#id"+master_subjects[i].user_id).style("display", "none")
						d3.select("#txt"+master_subjects[i].user_id).style("display", "none")

					} else if (filtered.indexOf(thisfilter) > -1) {
						d3.select("#id"+master_subjects[i].user_id).style("display", "inherit")
						d3.select("#txt"+master_subjects[i].user_id).style("display", "inline")

					}
				}
			}
			
			if (selected) {
				filtered.push(thisfilter)
			} else if (filtered.indexOf(thisfilter) > -1) {
				filtered.pop(thisfilter)
			}
		})

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
// FUNCTION: setNetworkDetails(d, multi)
// Purpose:  draws table of either pairwise or single-user data in network details box
//
//////////////////////////////////////////////////////////////////////////////////////

function setNetworkDetails(d, multi) {
	var userinfo = { 
			s:{	idx:null,
				id: (multi) ? d.source.name : d.name,
				music: "&lt;empty&gt;",
				floor: "&lt;empty&gt;",
				year: "&lt;empty&gt;",
				pol: "&lt;empty&gt;",
				sad: "&lt;empty&gt;",
				stress: "&lt;empty&gt;",
				exercise: "&lt;empty&gt;",
			  },
			t:{	idx:null,
				id: (multi) ? d.target.name : "&lt;empty&gt;",
				music: "&lt;empty&gt;",
				floor: "&lt;empty&gt;",
				year: "&lt;empty&gt;",
				pol: "&lt;empty&gt;",
				sad: "&lt;empty&gt;",
				stress: "&lt;empty&gt;",
				exercise: "&lt;empty&gt;"
			  }
			}
						
	for (var i = 0; i < master_subjects.length; i++) {
		if (master_subjects[i].user_id == userinfo.s.id) {
			userinfo.s.idx = i
			userinfo.s.music = master_subjects[i].fav_music
			userinfo.s.floor = master_subjects[i].floor
			userinfo.s.year = master_subjects[i].year_school
			userinfo.s.pol = master_subjects[i].libcon
			userinfo.s.sad = master_subjects[i].sad
			userinfo.s.stress = master_subjects[i].stressed
			userinfo.s.exercise = master_subjects[i].aerobic_per_week	
		} else if (master_subjects[i].user_id == userinfo.t.id) {
			userinfo.t.idx = i
			userinfo.t.music = master_subjects[i].fav_music
			userinfo.t.floor = master_subjects[i].floor
			userinfo.t.year = master_subjects[i].year_school
			userinfo.t.pol = master_subjects[i].libcon
			userinfo.t.sad = master_subjects[i].sad
			userinfo.t.stress = master_subjects[i].stressed
			userinfo.t.exercise = master_subjects[i].aerobic_per_week
		}
	}
	var targetdata = (multi) 
		? userinfo.t
		: {id:"",year:"",floor:"",pol:"",music:"",sad:"",stress:"",exercise:""}
	
		
	deetbox.html(
				"<table id='details-table'>"+
					"<tr class='head'>"+
						"<th> </th><th>Source Node</th><th>Target Node</th>" +
					"</tr><tr>" +
						"<td class='rowhead'>User ID</td>" +
						"<td>"+mapLabel(userinfo.s.id, "user_id") + "</td>" +
						"<td>"+mapLabel(userinfo.t.id, "user_id") + "</td>" + 
					"</tr><tr class='zebra'>" +
						"<td class='rowhead'>Year</td>" +
						"<td>"+mapLabel(userinfo.s.year,"year_school") + "</td>" +
						"<td>"+mapLabel(userinfo.t.year, "year_school") + "</td>" + 
					"</tr><tr>" +
						"<td class='rowhead'>Dorm Floor</td>" +
						"<td>"+mapLabel(userinfo.s.floor, "floor") + "</td>" +
						"<td>"+mapLabel(userinfo.t.floor, "floor") + "</td>" + 
					"</tr><tr class='zebra'>" +
						"<td class='rowhead'>Politics</td>" +
						"<td>"+mapLabel(userinfo.s.pol, "libcon") + "</td>" +
						"<td>"+mapLabel(userinfo.t.pol, "libcon") + "</td>" + 
					"</tr><tr>" +
						"<td class='rowhead'>Fav Music</td>" +
						"<td>"+mapLabel(userinfo.s.music, "fav_music") + "</td>" +
						"<td>"+mapLabel(userinfo.t.music, "fav_music") + "</td>" + 
					"</tr><tr class='zebra'>" +
						"<td class='rowhead'>Sad</td>" +
						"<td>"+mapLabel(userinfo.s.sad, "sad") + "</td>" +
						"<td>"+mapLabel(userinfo.t.sad, "sad") + "</td>" + 
					"</tr><tr>" +
						"<td class='rowhead'>Stressed</td>" +
						"<td>"+mapLabel(userinfo.s.stress, "stress") + "</td>" +
						"<td>"+mapLabel(userinfo.t.stress, "stress") + "</td>" + 
					"</tr><tr class='zebra'>" +
						"<td class='rowhead'>Exercise</td>" +
						"<td>"+mapLabel(userinfo.s.exercise, "stress") + "</td>" +
						"<td>"+mapLabel(userinfo.t.exercise, "stress") + "</td>" + 
				"</table>"
			)
}

function mapLabel(raw, thisvar) {
	if (raw.substr(0,4) == "TYPE") {
		var idx = d3.values(master_labels.type).indexOf( raw )
		return master_labels[thisvar][idx]
	} else {
		return raw
	}
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
// FUNCTION: summonFilterBox()
// Purpose:  raises/closes window containing node filtering options
//
//////////////////////////////////////////////////////////////////////////////////////

function summonFilterBox() {
	var visible = filterbox.style("visibility")
	filterbox.style("visibility", function() {return (visible=="visible") ? "hidden" : "visible"})
	filterbox.style("z-index", function() {return (visible=="visible") ? -10 : 10}) 
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
