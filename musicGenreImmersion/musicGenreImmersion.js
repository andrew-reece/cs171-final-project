var remaining = 1;
var dataset;
var YmdParser = d3.time.format("%Y-%m-%d").parse;
var dateExtent;
var timeScale, xScale, scoreScale;
var width = 960;
var genre = function(d) { return d.genre; };
var svg;
var xAxis, yAxis;
var xContainer, yContainer;
var filterLevel;
var maxScore = 0;


var margin = {top: 20, right: 20, bottom: 150, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
    
d3.csv("../data/musicGenreImmersion.csv", function(data) {
        dataset=data;
        if(!--remaining) { doSomething(); }    
});

function doSomething() {
  dataset.map(function(d) {
    d.date = YmdParser(d.date);
  })
  
  // get date extent
  dateExtent = d3.extent(dataset.map(function(d) { return d.date; }));
  // console.log(dateExtent[0], dateExtent[1]);

  // create timeScale
  timeScale = d3.scale.linear().domain([0,50]).range(dateExtent);
  
  // create xScale
  xScale = d3.scale.ordinal().domain(dataset.map(genre)).rangeRoundBands([0,width], .1);

  // scoreScale
  scoreScale = d3.scale.ordinal().domain(["","2 hours or less / week", "2-7 hours / week", "more than 7 hrs / week"]).range([0,1,2,3]);
  
  // yScale
  yScale = d3.scale.linear().range([height,0]);
  
  // xAxis
  xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom");
  
  // yAxis
  yAxis = d3.svg.axis()
      .scale(yScale)
      .orient("left");
  
  // SVG
  svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  // show range of dates
  // console.log(new Date(timeScale(0)), new Date(timeScale(10)), new Date(timeScale(30)), new Date(timeScale(50)));  

  // show range of categories
  // console.log(xScale("indie / alternative rock"), xScale("country / folk"), xScale("other"));
  
  // show range of scores
  // console.log(scoreScale(""),scoreScale("2 hours or less / week"), scoreScale("2-7 hours / week"), scoreScale("more than 7 hrs / week"));
  
  // container to hold xAxis
  xContainer = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", function(d) {
      return "rotate(-65)" 
    });

  // container to hold yAxis
  yContainer = svg.append("g")
      .attr("class", "y axis");
      
  // update visualization
    d3.selectAll("input[name=dateFilter]")
    .on("change", function () { updateVis(); });
  
  // updateVis();

}

function updateVis() {

  // Read our filter level from our slider
  filterLevel = parseInt(document.forms[0].dateFilter.value);

  // Get filterDate from filterLevel
  filterDate = new Date(timeScale(filterLevel));
  
  d3.select("#filterDate")
    .text(filterDate);
  
  console.log(filterLevel, filterDate);
  
  // initialize valueArray
  var valueArray = {};
  
  // initialize maxScore
  // I decided not to make the yAxis a "moving axis", as holding it fixed gives a better visualization over time
  // var maxScore = 0;

  // aggregate scores and get maxScore
  dataset.map(function(d) {
    if(d.date <= filterDate) {
      if(valueArray[d.genre] == undefined) { valueArray[d.genre] = 0; }
      valueArray[d.genre] += parseInt(scoreScale(d.score));
      if(valueArray[d.genre] > maxScore) { maxScore = valueArray[d.genre]}
    }
  })
  // console.log(valueArray, maxScore);
  
  // create dataAggregated
  var dataAggregated = [];
  for(key in valueArray) {
    var object = {genre: key, value: valueArray[key]};
    dataAggregated.push(object);
  }
  
  // console.log(dataAggregated.length);
  
  // map yScale domain
  yScale.domain([0,maxScore]);

  // update yContainer with updated yAxis
  yContainer.call(yAxis);
    
  // show bars
  svg.selectAll(".bar")
    .data(dataAggregated)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return xScale(d.genre); })
    .attr("width", xScale.rangeBand())
    .attr("y", function(d) { return yScale(d.value); })
    .attr("height", function(d) { return height - yScale(d.value); });

  // transition bars
  svg.selectAll(".bar")
    .data(dataAggregated)
    .transition()
    .attr("y", function(d) { return yScale(d.value); })
    .attr("height", function(d) { return height - yScale(d.value); });
    
    
}