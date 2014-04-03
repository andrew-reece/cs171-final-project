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
			  
d3.csv("com-pairs-time-series.csv", function(error, data) {

	
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
	elapse(3) // 4 is the index of the first column of time series data
})