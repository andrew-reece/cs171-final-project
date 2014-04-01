var links = []
var nodes = {}
var subjs = []
var subjs_loc = []
var floors = []
var r = 6
var freqmax = 0
var edgeScale = d3.scale.linear().range([0,1])

	d3.csv("../data/communication-tally-by-pair.csv", function(error, data) {

		data.forEach( function(d,i) {
			if (d.freq > freqmax) { freqmax = d.freq }
			var thisuser = d["source"]
			
			subjs.push(thisuser)

			
			links.push( 
						{ 	
							source: d["source"] , 
							target: d["target"] ,
							freq:   d["freq"] 
						} 
					  )
		})
		
		links.forEach(function(link) {
		  link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
		  link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
		});	

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
		.style("stroke-width", function(d) {return edgeScale(d.freq)});
			
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
			.attr("x", 8)
			.attr("y", ".31em")
			.text(function(d) { return d.source; });
	
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
	})