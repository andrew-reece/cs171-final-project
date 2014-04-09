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
var hm_gridSize = 30,
	h = hm_gridSize,
	w = hm_gridSize,
	rectPadding = 60;

var color_low = "aliceblue", color_med = "lightblue", color_high = "navy";

var hm_margin = {top: 20, right: 80, bottom: 30, left: 50},
	hm_width = 640 - hm_margin.left - hm_margin.right,
	hm_height = 280 - hm_margin.top - hm_margin.bottom;

var heatmapColorScale = d3.scale.linear()
	 .domain([0, .2, .5])
	  .interpolate(d3.interpolateRgb)
	  .range([color_low, color_med, color_high])
var libcon = ["CON3", "CON2", "CON1", "NEUT", "LIB1", "LIB2", "LIB3"]
var libcon_range = [1*hm_gridSize,2*hm_gridSize,3*hm_gridSize,4*hm_gridSize,5*hm_gridSize,6*hm_gridSize,7*hm_gridSize]
var xScale = d3.scale.ordinal().domain(libcon).range(libcon_range)
var yScale = d3.scale.ordinal().domain(libcon.reverse()).range(libcon_range.reverse())

var yAxis = d3.svg.axis().scale(yScale).orient("left")
var xAxis = d3.svg.axis().scale(xScale).orient("bottom")
var hmap_data, hmap_area, heatmap

d3.csv("data/libcon-heatmap.csv", function(error, data) {
	
	hmap_data = data
	
	hmap_area = d3.select("#heatmap").append("svg")
		.attr("width", hm_width + hm_margin.left + hm_margin.right)
		.attr("height", hm_height + hm_margin.top + hm_margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + hm_margin.left + "," + hm_margin.top + ")");

	
	hmap_area.append("text")
		.attr("transform", "translate(35,"+(hm_height+hm_margin.top+10)+")")
	  	.style("font-size", "12pt")
		.text("CON")
	hmap_area.append("text")
		.attr("transform", "translate(215,"+(hm_height+hm_margin.top+10)+")")
	  	.style("font-size", "12pt")
		.text("LIB")
	hmap_area.append("text")
		.attr("transform", "translate(-10,"+(hm_height+hm_margin.top-10)+")")
	  	.style("font-size", "12pt")
		.text("CON")
	hmap_area.append("text")
		.attr("transform", "translate(-5,"+(hm_margin.top+20)+")")
	  	.style("font-size", "12pt")
		.text(" LIB")
		/*hmap_area.append("g")
			.attr("class", "x-axis")
			.attr("width", 100)
			.attr("transform", "translate(35,"+(hm_height+hm_margin.top-10)+")")
			.call(xAxis)*/
	heatmap = hmap_area.selectAll(".heatmap")
		.data(data)
	 	 .enter()
	 	 .append("rect")
			.attr("x", function(d) { 
				//console.log(d)
				var val = d.pairs.split("-")[0]
				return xScale(val); })
			.attr("y", function(d) { 
				var val = d.pairs.split("-")[1]
				return yScale(val); })
			.attr("width", function(d) { return w; })
			.attr("height", function(d) { return h; })
			.style("stroke-width", "1px")
			.style("stroke", "black")
			.style("fill", function(d) { 
				var first_date = d3.entries(data[0])[2].key
				return heatmapColorScale(d[first_date]); });
})



			  
d3.csv("data/com-pairs.csv", function(error, data) {

	
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
	var width = 960,
	height = 650;
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
					 .attr("transform", "translate(100,100)")
					 .html("Date")
	
	var start_button = svg.append("g")
		.attr("transform", "translate(20,0)")
	
	start_button.append("rect")
		.attr("width", 100)
		.attr("height", 20)
		.style("fill", "whitesmoke")
		.style("stroke","steelblue")
		.style("stroke-width", "1px")
		.on("click", function() {return elapse(4)}) // 4 is the index of the first column of time series data				 
	start_button.append("text")
		.style("stroke-width","1px")
		.style("fill", "rgb(110,110,110)")
		.style("font-size", "12pt")
		.attr("transform","translate(3,15)")
		.text("Click to start")
		
		// Use elliptical arc path segments to doubly-encode directionality.
	function tick() {
	  path.attr("d", linkArc);
      circle
        .attr("cx", function(d) { return d.x = Math.max(r, Math.min(width - r, d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(r, Math.min(height - r, d.y)); });
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
					var thisdate = (thiskey<(keys.length-1)) ? keys[thiskey].substr(1) : "July 2009 <br />[end of study]"
					return "Date<br /><br />"+thisdate
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
		console.log('all done')
	}
	
})