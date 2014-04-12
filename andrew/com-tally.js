var links = []
var nodes = {}
var subjs = []
var subjs_loc = []
var floors = []
var r = 6
var freqmax = 0
var edgeScale = d3.scale.linear().range([0,40])
var keys = []
var numkeys
// linear color gradient scale from HW1
var color = d3.scale.linear()
			  .domain([5, 40])
			  .interpolate(d3.interpolateRgb)
			  .range(["#fee0d2", "#de2d26"]) // light-dark red via colorbrewer2.org

//height of each row in the heatmap
//width of each column in the heatmap
var hm_gridSize = 25,
	h = hm_gridSize,
	w = hm_gridSize,
	rectPadding = 60;

var hmap_xaxis, hmap_yaxis

var heatmap_colors = { low:"#deebf7", med:"#9ecae1", high:"#3182bd", vhigh:"#08519c" };

var hm_margin = {top: 15, right: 80, bottom: 30, left: 0},
	hm_width = 350 - hm_margin.left - hm_margin.right,
	hm_height = 500 - hm_margin.top - hm_margin.bottom;

var heatmapColorScale = d3.scale.linear()
	 .domain([0, .2, .5, 2.5])
	  .interpolate(d3.interpolateRgb)
	  .range([heatmap_colors.low, heatmap_colors.med, heatmap_colors.high, heatmap_colors.vhigh])


var hmap_data, heatmap
var hmap_area = d3.select("#heatmap").append("svg")
	.attr("width", hm_width + hm_margin.left + hm_margin.right)
	.attr("height", hm_height + hm_margin.top + hm_margin.bottom)
  .append("g");
var hmap_x = hmap_area.append("g")
		.attr("class", "x-axis")
		.attr("width", 100)
		.attr("height", 0)
		.attr("transform", "translate(30,0)")
var hmap_y = 		
		hmap_area.append("g")
			.attr("class", "y-axis")
			.attr("width", 100)
			.attr("transform", "translate(60,"+hm_margin.top+")")
			
var file = "data/com-pairs.csv"
var heatmap_name = "libcon"
var x = d3.scale.ordinal()
var y = d3.scale.ordinal()
var yAxis = d3.svg.axis().scale(y).orient("left")
var xAxis = d3.svg.axis().scale(x).orient("bottom")

var hmdata

getData()

function getData() {
	var path = "data/variables.json"
	d3.json(path, function(error, data) { renderPage(data) })
}

function renderPage(vardata) {
	
	d3.select("#heatmap-dropdown")
				.on("change", function() { 
						heatmap_name = d3.select(this).property("value")
						clearHeatmap()
						buildHeatmap(heatmap_name, vardata)
					})
	var select = document.getElementById("heatmap-dropdown")
	
	for (var i = 0; i < d3.entries(vardata.name).length; i++) {
		var option = document.createElement("option")
		option.text = vardata.nickname[i]
		option.value = vardata.name[i]
		console.log(option)
		select.add(option)
	}
			  
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
		}
		numkeys = keys.length
	
		//var colors = d3.scale.category20().domain(floors)
		var width = 800;
		var height = 600;
		edgeScale.domain([0,freqmax])
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

		var svg = d3.select("#graph").append("svg")
			.attr("width", width)
			.attr("height", height);

		var path = svg.append("g").selectAll("path")
			.data(force.links())
		  .enter().append("path")
			.attr("class", "link")
			.style("stroke-width", function(d) {
				return edgeScale(d[keys[4]])
			});
			
		var circle = svg.append("g").selectAll("circle")
			.data(force.nodes())
		  .enter().append("circle")
			.attr("r", r)
			.style("fill", function(d) {return "steelblue"})
			.call(force.drag);
	
		var text = svg.append("g").selectAll("text")
			.data(force.nodes())
			.enter()
			.append("text")
				.attr("x", 12)
				.attr("y", 3)
				.style("font-size", "12pt")
				.text(function(d) { return d.name; });
	
		var datebox = d3.select("#date").append("text")
						 .attr("class", "date-box")
						 .attr("transform", "translate(100,90)")
	
		d3.select("#start-button")
			.on("click", function() {return elapse(4)}) // don't hard code argument here, it may change based on variable
		
			// Use elliptical arc path segments to doubly-encode directionality.
		function tick() {
		  path.attr("d", linkArc);
		  // r+10 b/c that keeps the numbers of nodes near the viewbox border from getting cut off
		  // if it's just "r" then the node names (i.e. numbers) can float out of view
		  circle .attr("cx", function(d) { return d.x = Math.max((r+10), Math.min(width - (r+10), d.x)); })
				 .attr("cy", function(d) { return d.y = Math.max((r+10), Math.min(height - (r+10), d.y)); });
		  text.attr("transform", transform);
		}

		function linkArc(d) {
		  var dx = d.target.x - d.source.x,
			  dy = d.target.y - d.source.y,
			  dr = Math.sqrt(dx * dx + dy * dy);
		  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
		}

		function transform(d) {
		  return "translate(" + d.x + "," + d.y + ")";
		}
	
		function elapse(thiskey) {
			path.transition()
				.duration(300)
				.style("stroke-width", function(d) {
					var weight = edgeScale(d[keys[thiskey]])
					if (weight >= 5) {
						d3.select(this).style("stroke",color(weight))
					}
					return weight
				})
			datebox
					.html(function() {
						var thisdate = (thiskey<(keys.length-1)) ? keys[thiskey].substr(0) : "July 2009 [end of study]"
						return thisdate
						})
			heatmap
				.style("fill", function(d) { 
					return heatmapColorScale(d[keys[thiskey]]); });
			
			svg.transition()
				.duration(300)
				.each("end", function() {
					thiskey++
				
					return (thiskey <= numkeys) 
						? elapse(thiskey) 
						: end()
				})	
		}
	
		function end() {
			heatmap
				.style("fill", function(d) { 
					return heatmapColorScale(d["total"]); });	
		}
	
	})
}


function clearHeatmap() {
	d3.selectAll(".heatmap").remove()
}

function buildHeatmap(name, vardata) {

	var path = "data/"+name+"-heatmap.csv"
	
	var entries = d3.entries(vardata.name)
	var var_idx
	entries.forEach( function(x) {
		if (x.value == name) { var_idx = x.key }
	})
	
	var var_names = vardata.var_range[var_idx]
	
	var var_range = []
	for (var i = 1; i <= var_names.length; i++) {
		var_range.push(i*hm_gridSize)
		if (i == var_names.length) {
			drawHeatmap(vardata)
		}
	}
	
	function drawHeatmap(vardata) {	
		d3.select("#heatmap-description").html(function() { return vardata.descrip[var_idx] })
		x.domain(var_names).range(var_range)
		y.domain(var_names.reverse()).range(var_range.reverse())
		var map_height = var_names.length*hm_gridSize+20
		var max_label_length = d3.max(var_names, function(d) {return d.length})
		var x_offset = max_label_length*5.5
		hmap_x.attr("height", map_height)
		hmap_x.attr("transform", "translate(30,"+map_height+")")
		d3.select(".x-axis").call(xAxis)
		d3.select(".x-axis")
			.selectAll("text")
			.attr("transform", "translate(0,"+x_offset+")rotate(-90)")		
		d3.select(".y-axis").call(yAxis)	
		
		d3.csv(path, function(error, data2) {
			var hmap_data2 = data2
				
			heatmap = hmap_area.selectAll(".heatmap")
				.data(data2)
				 .enter()
				 .append("rect")
					.attr("class", "heatmap")
					.attr("x", function(d) { 
						//console.log(d)
						var val = d.pairs.split("-")[0]
						return x(val); })
					.attr("y", function(d) { 
						var val = d.pairs.split("-")[1]
						return y(val); })
					.attr("width", function(d) { return w; })
					.attr("height", function(d) { return h; })
					.attr("transform", "translate(30,0)")
					.style("stroke-width", "1px")
					.style("stroke", "black")
					.style("fill", function(d) { 
						var first_entry = d3.entries(data2[0])[2].key
						return heatmapColorScale(d[first_entry])
					})

		})
	}
}
