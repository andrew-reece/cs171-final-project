
var margin = {top: 120, right: 20, bottom: 70, left: 120},
    width = 1150 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .2);

var y = d3.scale.pow().exponent(.7)
    .range([height, 0]);

var colors = d3.scale.category10()

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(15);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var hyde = []
var usc = []
var madd = []
var pb = []
var un = []
var years = []
var dataSet = []
var consensus = [] // for consensus estimates
var years = [] // for keeping track of each year (do we need this here?)

d3.csv("../timeline.csv", function(error, data) {

	data.forEach( function(d) {
		var thisconsensus = 0
		var thisct = 0
		years.push(d.year)
		if (d.HYDE) {hyde.push({ year:d.year , val:d.HYDE }); thisconsensus += +d.HYDE; thisct++}
		if (d.USCensus) {usc.push({ year:d.year , val:d.USCensus }); thisconsensus += +d.USCensus; thisct++}
		if (d.Maddison) {madd.push({ year:d.year , val:d.Maddison }); thisconsensus += +d.Maddison; thisct++}
		if (d.PopulationBureau) {pb.push({ year:d.year , val:d.PopulationBureau }); thisconsensus += +d.PopulationBureau; thisct++}
		if (d.UN) {un.push({ year:d.year , val:d.UN }); thisconsensus += +d.UN; thisct++}
		consensus.push({ year: d.year, val: (thisconsensus/thisct) })
	})
		
	dataSet["hyde"] = hyde
	dataSet["usc"] = usc
	dataSet["madd"] = madd
	dataSet["pb"] = pb
	dataSet["un"] = un
	
	colors.domain(Object.keys(dataSet))
	
	x.domain(years);

	y.domain([0.01,pb[pb.length-1].val]) // pb has biggest value, can't get d3.max to work

	return drawGraph()
})

function drawGraph() {


	// make an average for each year
  svg.selectAll(".circle")
      .data(consensus)
    .enter().append("circle")
      .attr("class", "circle")
      .attr("cx", 300)
      .attr("cy", 300)
      .attr("r", 10)
    
  setInterval(growglobe, 500)

	//for( var s in dataSet ) { drawEstimate(s) }
}

function growglobe() {
	
}