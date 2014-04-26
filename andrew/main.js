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
// 	ONLY CHANGE THIS FUNCTION ARG TO SWITCH TIME SERIES BETWEEN com & prox
//
	setTimeSeriesData("com") // switch arg to "prox" to load proxdata as default
//
//
////////////////////////////////////////////////////////
		
// initialize global svg var
	var svg

// master vars hold persistent user/variable data after load via csv/json
	var master_vardata, master_subjects, master_labels
	
// force-directed graph objects
	var nodes = {}, links = []
	var path, circle, text, force
	var redraw = false
	
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
	var filtered_nodes = []
	
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
	
// variable to determine if we should run the animation
    var animation = false;
    
// store data for chord functions
var chData
var chDataByPair = {}

// svg for chord diagram
var svg_chord

//  variables for chord diagram
var innerRadius = Math.min(width, height) * .38,
outerRadius = innerRadius * 1.1,
students_g, text_g, ticks_g,
filterLevel, filterDate,
last_layout, user

// chord diagram: arc path data generator for the groups
var arc = d3.svg.arc()
   .innerRadius(innerRadius)
   .outerRadius(outerRadius);

// chord diagram: chord path data generator for the chords
var path2 = d3.svg.chord()
   .radius(innerRadius);
   
// chord diagram: transition duration (needs to be a little slower than force graph)
var chordDuration = 1500;
    
//////////////////////////////////////////////////////////////////////////////////////
//      END GLOBAL VARIABLES
//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
//      STARTUP
//		* these functions get things going
//////////////////////////////////////////////////////////////////////////////////////
 
    // factored start-button event handler out of main.html as it needs more logic
    // this could be added to one of the intiialization functions but is just here for
    // now
    d3.select("#start-button")
  		.on("click", function() {
  		  animation = animation == false ? true : false;
  		  if(animation) { 
  		      d3.select("#start-button").text("Click to stop");
  
            // if we are at the end, start from the beginning
  		      if(slider.property("value") == numkeys - 1) { slider.property("value", elapse_seed); }
  
            return elapse(slider.property("value")); 
        } else {
            d3.select("#start-button").text("Click to start");
        }
  		}
    )
    
    // if dataset is switched, reload everything
    d3.selectAll(".data-choice")
    	.on("click", function() {
    		keys = []
    		dateRange = []
    		setTimeSeriesData(this.value)
    		redraw = true
    		getVarData()
    	})
    	
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
	d3.csv(fpath, function(error, data) { 
		data.forEach( function(d) {
			nodes[d.user_id] = { name: 				d.user_id,
								 year_school:		d.year_school,
								 fav_music: 		d.fav_music,
								 floor: 			d.floor,
								 libcon:			d.libcon,
								 sad:				d.sad,
								 stressed:			d.stressed,
								 aerobic_per_week: 	d.aerobic_per_week
								}
		})
		master_subjects = data; 
		getAxisLabels(); 
	})
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

function elapse(thiskey) {
    // console.log("thiskey:", thiskey);
    // console.log("slider:", slider.property("value"));
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
    
    //update chord data
	if(svg_chord) { 
  filterComm(chData)
  };
    
  // if time series is selected as animation (rather than discrete intervals on slider),
  // this triggers recursion that runs until time is exhausted
  	if (animation) {
  	  slider.property("value", thiskey)
  		svg.transition()
  			.duration(function() {
  			if (current_graph == "chord-tab") {return chordDuration}
  			else {return 300}
  			})
  			.each("end", function() {
  				thiskey++
  
  				return (thiskey < numkeys) 
  					? elapse(thiskey) 
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
		  link.source = nodes[link.source];
		  link.target = nodes[link.target];
		});	
// sets filter checkbox functionality based on node data
	setFilters(nodes)
	setFilterTooltips(master_vardata)
	
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
    
    // console.log(keys)
    // console.log(dateRange)
    
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
		
	    // store data for chord diagram
    	chData = data
    	data.map(function(d,i) {
    	 var pairName = (+d.source.name < +d.target.name) ?
                   "user" + +d.source.name  + "-" + "user" + +d.target.name:
                   "user" + +d.target.name  + "-" + "user" + +d.source.name;
      	// console.log(pairName, d.source.name, d.target.name);
      	chDataByPair[pairName] = d;
    	});

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
// FUNCTION: arcTween(oldLayout)
// Purpose:  transition function for updating Chord Graph
//
//////////////////////////////////////////////////////////////////////////////////////

function arcTween(oldLayout) {
   //this function will be called once per update cycle
       
   //Create a key:value version of the old layout's groups array
   //so we can easily find the matching group 
   //even if the group index values don't match the array index
   //(because of sorting)
   var oldGroups = {};
   
   if (oldLayout) {
       oldLayout.groups().forEach( function(groupData) {
           oldGroups[ groupData.index ] = groupData;
       });
   }
   
   return function (d, i) {
       var tween;
       var old = oldGroups[d.index];
       if (old) { //there's a matching old group
           tween = d3.interpolate(old, d);
       }
       else {
           //create a zero-width arc object
           var emptyArc = {startAngle:d.startAngle,
                           endAngle:d.startAngle};
           tween = d3.interpolate(emptyArc, d);
       }
       
       return function (t) {
           return arc( tween(t) );
       };
   };
}


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
						? setAxis("y", region, 30, 10)
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
						
		// call drawHeatmap function, which actually renders the heatmap
		
			drawHeatmap(vardata, var_names, var_range, var_idx, 
						hmpath, location, region, x_axis, y_axis, offset, axis_labels)
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
// FUNCTION: chordKey(data)
// Purpose:  creates a relationship between source and target for the chord
//
//////////////////////////////////////////////////////////////////////////////////////

function chordKey(data) {
   return (data.source.index < data.target.index) ?
       data.source.index  + "-" + data.target.index:
       data.target.index  + "-" + data.source.index;
   
   //create a key that will represent the relationship
   //between these two groups *regardless*
   //of which group is called 'source' and which 'target'
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: getPairName(data, users)
// Purpose:  creates a relationship between source and target for the pairName
//
//////////////////////////////////////////////////////////////////////////////////////

function getPairName(data, users) {
   return (users(data.source.index) < users(data.target.index)) ?
       users(data.source.index)  + "-" + users(data.target.index):
       users(data.target.index)  + "-" + users(data.source.index);
   
   //create a key that will represent the relationship
   //between these two groups *regardless*
   //of which group is called 'source' and which 'target'
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: chordTween(data)
// Purpose:  transition function for chord diagram
//
//////////////////////////////////////////////////////////////////////////////////////

function chordTween(oldLayout) {
   //this function will be called once per update cycle
   
   //Create a key:value version of the old layout's chords array
   //so we can easily find the matching chord 
   //(which may not have a matching index)
   
   var oldChords = {};
   
   if (oldLayout) {
       oldLayout.chords().forEach( function(chordData) {
           oldChords[ chordKey(chordData) ] = chordData;
       });
   }
   
   return function (d, i) {
       //this function will be called for each active chord
       
       var tween;
       var old = oldChords[ chordKey(d) ];
       if (old) {
           //old is not undefined, i.e.
           //there is a matching old chord value
           
           //check whether source and target have been switched:
           if (d.source.index != old.source.index ){
               //swap source and target to match the new data
               old = {
                   source: old.target,
                   target: old.source
               };
           }
           
           tween = d3.interpolate(old, d);
       }
       else {
           //create a zero-width chord object
           var emptyChord = {
               source: { startAngle: d.source.startAngle,
                        endAngle: d.source.startAngle},
               target: { startAngle: d.target.startAngle,
                        endAngle: d.target.startAngle}
           };
           tween = d3.interpolate( emptyChord, d );
       }

       return function (t) {
           //this function calculates the intermediary shapes
           return path2(tween(t));
       };
   };
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
	d3.select("#svg-1").selectAll(".heatmap").remove()
 	d3.select("#svg-1").selectAll(".axis-instance").remove()
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: clearNetworkDetails()
// Purpose:  clears out network detail table cells
//
//////////////////////////////////////////////////////////////////////////////////////

function clearNetworkDetails() {
	d3.selectAll(".network-detail").html("")
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: drawHeatmap(vardata, var_names, var_range, hmpath)
// Purpose:  draws heatmap
//
//////////////////////////////////////////////////////////////////////////////////////


  function drawHeatmap(vardata, var_names, var_range, var_idx, 
  						hmpath, location, region, x_axis, y_axis, offset, axis_labels) {	
  
    // get hmap data
    d3.csv(hmpath, function(error, data) {
      // if array len = 0, that means there's no need to map, the originals are
  		// the actual values (true for sad, stressed, and exercise hrs)
  		
  		if (axis_labels.length > 0) {
  			
  		  // yAxis.tickValues(axis_labels)
  		  xAxis.tickValues(axis_labels)
  				
        // .slice(0) copies array before reversing
        // otherwise .reverse() reverses the original array, too
        // xAxis.tickValues(axis_labels.slice(0).reverse())
        yAxis.tickValues(axis_labels.slice(0).reverse())
  		} else { // tickValues(null) takes array values as ticks
  			
  			// we want null arg for sad, stressed, etc, where ticks and values are equal
        yAxis.tickValues(null)
        xAxis.tickValues(null)
  		}
  
  	  // set hm dimension params
  	  var map_height = var_names.length * hm.size + offset.h
  	  var max_label_length = d3.max(var_names, function(d) {return d.length})
  	  var x_axis_vert_offset = max_label_length * offset.multiplier.x 
      
  	  // define scale domains and ranges
  	  // y.domain(var_names).range(var_range)
  	  // x.domain(var_names.slice().reverse()).range(var_range)
  	  x.domain(var_names).range(var_range)
  	  y.domain(var_names.slice().reverse()).range(var_range)

  	// set axes
  	x_axis.attr("height", map_height)
  	x_axis.attr("transform", "translate("+offset.x+","+map_height+")")
  	
  	x_axis.append("g").attr("class", "axis-instance").call(xAxis)
  	x_axis.selectAll("text")
  		.style("text-anchor", "end")
  		.attr("transform", "translate(0,"+x_axis_vert_offset+")rotate(-90)")		
  	y_axis.append("g").attr("class", "axis-instance").call(yAxis)	
  	  
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
  					return heatmapColorScale(d[d3.entries(data[0])[slider.property("value") - 2].key])
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
	if(heatmap) { 
		 for(var hm in heatMapArray) {
			  heatMapArray[hm].style("fill", function(d) { 
				  return heatmapColorScale(d["total"]); 
			  });
		 }
	}
	d3.select("#start-button").text("Click to start");
  	animation = false;
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: filterComm(data)
// Purpose:  filters the data for use in the chord graph, based on the slider
//
//////////////////////////////////////////////////////////////////////////////////////

function filterComm(data) {
  // console.log(data)
  user = "all";
  var comm = [];
  
  //console.log("filterComm data:", data)
  
  filterLevel = slider.property("value")
  //console.log("filterlevel:", filterLevel)
  var key = timeScale(filterLevel)
  //console.log("key:", key)
  
  for (var i = 0; i<data.length; i++) {
    if(+data[i]["source"]["name"] == +user || +data[i]["target"]["name"] == +user || user == "all") {
      var dataobject = data[i];
      //console.log(dataobject);
      
      commObject = {};
      commObject["source"] = +dataobject["source"]["name"];
      commObject["target"] = +dataobject["target"]["name"];
      commObject["freq"] = +dataobject[key];
      
      comm.push(commObject);
    }
  }
  
  //console.log("filterComm:",comm)
  matrixMap(comm);
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: matrixMap(comm)
// Purpose:  creates square matrix for chord diagram
//
//////////////////////////////////////////////////////////////////////////////////////

function matrixMap(comm) {

   var matrix = [];
   var users = [];
   
   /* get all the unique users (both senders & receivers)
   because that is going to be the number of arrays in the
   square matrix. */
   
   //first add all unique source IDs
   for (var i = 0; i< comm.length; i++) {
//     if (comm[i]["freq"] != 0) {
       var add = 1;
       for (var u = 0; u < users.length; u++) {
         if (comm[i]["source"] == users[u]) {
           add = 0;
         };
       }
       if (add == 1) {
       users.push(+comm[i]["source"]);
      }
//     }
   }

   //then add any unique Target IDs that weren't already added
   for (var i = 0; i< comm.length; i++) {
//    if (comm[i]["freq"] != 0) {
       var add = 1;
       for (var u = 0; u < users.length; u++) {
         if (comm[i]["target"] == users[u]) {
           add = 0;
         };
       }
       if (add == 1) {
       users.push(comm[i]["target"]);
       }
//     }
   }
   
   users.sort(function(a,b) {
     return a - b;
   })
   
//   console.log("users:", users);
   
   matrix.length = users.length;
   for (var i = 0; i< matrix.length; i++) {
     matrix[i] = [];
     matrix[i].length = matrix.length;
     for (var j = 0; j<matrix.length; j++) {
       matrix[i][j] = 0;
     }
   };
   
 //populate the matrix with the frequency value
 //for the source/user combination
   for (var u = 0; u<users.length; u++) {
     for (var c = 0; c<comm.length; c++) {
       if (comm[c]["source"] == users[u]) {
         for (var u2 = 0; u2<users.length; u2++) {
           if (comm[c]["target"] == users[u2]) {
             matrix[u][u2] = comm[c]["freq"];
           }
         }
       }
     }
   };
   
   //console.log(matrix)
   
updateChord(matrix, users)
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: filterNodes
// Purpose:  shows/hides nodes based on filter checkboxes
//
//////////////////////////////////////////////////////////////////////////////////////

function filterNodes(obj) {

	// is the function call from the reset button?
	var reset = (obj == "reset") ? true : false
	
	// if not, then get the specific on/off status and name of the calling filter
	if (!(reset)) {
		var selected= d3.select(obj).property("checked")
		var filname = d3.select(obj).attr("name")
	}
	
	// if reset, call filterNodesInner() with only the reset parameter set
	// (we don't need anything else, as it applies to all filters)
	if (reset) {
	
		filterNodesInner(null, null, null, null, true)
	
	// if it's an aggregate filter (eg. Conservative or Liberal)...
	} else if (d3.select(obj).classed("agg")) { 
	
		// break down the aggregate into its parts
		var filterset = d3.select(obj).attr("value").split("-")
		// call filterNodesInner() for each part
		filterset.forEach( function(f) {
			var filval = f
			var thisfilter = filname+"-"+filval
			filterNodesInner(selected, filname, filval, thisfilter, false)
		})

	// in the case of a specific filter...
	} else {
	
		// call filterNodesInner() for just the single filter
		var filval  = d3.select(obj).attr("value")
		var thisfilter = filname+"-"+filval
		filterNodesInner(selected, filname, filval, thisfilter, false)
		
	}
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: filterNodesInner
// Purpose:  nucleus function inside filterNodes()
//			 this is so aggregate filters (ie. 'Mildly Stressed') that need to set
//			 more than one filter at a time can use a loop inside filterNodes()
//			 that calls the actual filtering behavior.
//
//////////////////////////////////////////////////////////////////////////////////////

function filterNodesInner(selected, filname, filval, thisfilter, reset) {

	// both .node and .link class have all the variable information about each subject
	// so we can use d3.selectAll for nodes and links (ie. edges) to check if the current
	// filter applies to a given graph element.  if so, we blank it out, if not, leave be.
	
	// the node label (ie. '34') visibility is controlled within the node display setting
	// edges only display if both endpoint-nodes are also visible.
	
	d3.selectAll(".node")
	  .style("display", function(d) {
	  
		 if (reset) {	// if reset button is clicked
		 
			d3.select("#txt"+d.name).style("display", "inline") // update label text
		 	return "inline"
		 	
		 // does the calling filter apply to this node?
		 } else if (mapLabel( d[filname], filname) == filval) { 
		 
		 	if (selected) {	// selected = checkbox is checked
		 	
				d3.select("#txt"+d.name).style("display", "none")
				return "none"
				
		 	} else {		// else checkbox is unchecked, ie. drop the filter
	
				d3.select("#txt"+d.name).style("display", "inline")
				return "inline"
		 	}
		 } 
		 // otherwise, just stick with what we've already got
		 else { return d3.select(this).style("display") }
		 
	  })
		
	d3.selectAll(".link")
		.style("display", function(d,i) {
		
			if (reset) { return "inline" } // reset makes all edges visible
			
			else {
			
				// check to ensure both node-endings are visible
				if ((d3.select("#id"+d.source.name).style("display") == "inline") && 
					(d3.select("#id"+d.target.name).style("display") == "inline")) {
					
					return "inline"
				} 
				
				// otherwise hide the edge between them	
				else { return "none" }
			}
		})	 
}



//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: getDefaultChordLayout()
// Purpose:  basis for updating chord diagram's layout
//
//////////////////////////////////////////////////////////////////////////////////////

function getDefaultChordLayout() {
   return d3.layout.chord()
   .padding(0.03)
   .sortSubgroups(d3.descending)
   .sortChords(d3.ascending);
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
// FUNCTION: mapLabel(raw, thisvar)
// Purpose:  converts generic variable names to meaningful labels (ie. TYPE1 -> LIB1
//
//////////////////////////////////////////////////////////////////////////////////////

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
// FUNCTION: multiFilter(cl)
// Purpose:  checks all filter checkboxes under main class 
//			 (ie. checking "Conservative" checks all conservative sub-groups)
//
//////////////////////////////////////////////////////////////////////////////////////

function multiFilter(cl) {
	d3.selectAll("."+cl)
		.property("checked", function() {
			return (d3.select(this).property("checked")) ? false: true
		})
		// multi-filter doesn't trigger an onchange event, 
		// so we need to run filterNodes manually for each item that gets checked here. 
		.each(function() {filterNodes(this)})
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
				var xoffset = multiplier_x[i]*260
				var yoffset = multiplier_y[i]*280
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

svg_chord = svg.append("g")
   .attr("id", "circle")
   .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
   
   svg_chord.append("circle")
   .attr("r", outerRadius);

    
filterComm(chData)
   
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderForceGraph()
// Purpose:  draws force-directed graph
//
//////////////////////////////////////////////////////////////////////////////////////

function renderForceGraph() {	

	// redraw triggers when user switches datasets
	// this remakes the force graph with new node/link values
	
	if (redraw) {
	
		force .nodes(d3.values(nodes))
			  .links(links)
			  .start()
			  
		path = path.data(force.links())
		path.exit().remove()

		renderForceLinks()
		
		circle = circle.data(force.nodes())
		circle.exit().remove()
		
		renderForceNodes()
		
		text = text.data(force.nodes())
		
	} else {
	
		force = d3.layout.force()
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

		renderForceLinks()
		
		circle = svg.append("g").selectAll("circle")
			.data(force.nodes())
		
		renderForceNodes()
		
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
}
	
//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderForceLinks()
// Purpose:  helper function for renderForce(), draws edges
//
//////////////////////////////////////////////////////////////////////////////////////

function renderForceLinks() {

	path.enter().append("path")
		.attr("class", function(d) {
			var e1 = "edge"+d.source.name
			var e2 = "edge"+d.target.name
			return "link "+e1+" "+e2
		})
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
}


//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: renderForceNodes()
// Purpose:  helper function for renderForce(), draws nodes
//
//////////////////////////////////////////////////////////////////////////////////////

function renderForceNodes() {
	circle.enter()
		.append("circle")
			.attr("class", "node")
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
			filterNodes(this)
		})
	d3.select("#filter-reset")
		.on("click", function() {
			filterNodes("reset")
		})
}

//////////////////////////////////////////////////////////////////////////////////////
//
// FUNCTION: setFilterTooltips
// Purpose:  sets mouseover tooltips (using 'title' attr) to describe grouped filters
//			 tooltip text comes from variables.json
//
//////////////////////////////////////////////////////////////////////////////////////

function setFilterTooltips(vardata) {

	d3.selectAll(".fb-cat")
		.datum(function() { 
			var thisvar = d3.select(this).attr("id").substr(3)
			var thisidx = d3.values(vardata.name).indexOf(thisvar)
			var thisinfo = vardata.filter_cats[thisidx]
			return thisinfo})
		.attr("title", function(d) { return d })
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

function setNetworkDetails(d, isedge) {

	// this function displays info for both single nodes and for edge pairwise relationships
	// 'd' is the edge object, passed in from renderForce()

	// 'isedge' boolean determines whether target data is displayed or not
	var targetdata = (isedge) 
		? d.target
		: {	name:"",year_school:"",floor:"",libcon:"",
			fav_music:"",sad:"",stressed:"",aerobic_per_week:"" }
	
	// source/target objects have other properties besides the ones we want
	// so 'cats' array is to check that we're only using desired properties
	var cats = ['name','year_school','floor','libcon','fav_music','sad','stressed','aerobic_per_week']

	// each table cell has a unique id that includes the variable name it displays
	// here we loop through source/target objects, and display their attribute values in the appropriate table cells		
	d3.entries(d.source).forEach( function(el) {
		if (cats.indexOf(el.key) > -1) {
			d3.select("#td-s-"+el.key).html( mapLabel(el.value, el.key) )
		}
	})
	
	d3.entries(targetdata).forEach( function(el) {
		if (cats.indexOf(el.key) > -1) {
			d3.select("#td-t-"+el.key).html( mapLabel(el.value, el.key) )
		}
	})
	
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
// FUNCTION: setTimeSeriesData(tslabel)
// Purpose:  sets global vars that define var/filepaths for time series datasets
//
//////////////////////////////////////////////////////////////////////////////////////

function setTimeSeriesData(tslabel) {
	ts = tslabel
	ts_type = "-"+ts+"data"	
	ts_filename = "data/"+ts+"-pairs.csv"
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
//
// FUNCTION: updateChord(matrix, users)
// Purpose:  updates the chord graph with new date selection
//
//////////////////////////////////////////////////////////////////////////////////////

// some ideas pulled from http://fleetinbeing.net/d3e/chord.html
// and http://stackoverflow.com/questions/21813723/change-and-transition-dataset-in-chord-diagram-with-d3

function updateChord(matrix, users) {
  var layout = getDefaultChordLayout();
  layout.matrix(matrix);

/*
 	 var fill = d3.scale.ordinal()
     	 .domain(d3.range(users.length))
     	 .range(colorbrewer.Paired[12]);  	
*/ 
   var fill = d3.scale.ordinal()
     	 .domain(d3.range(1,80))
     	 .range(colorbrewer.Paired[12]);  
           
// 	 svg_chord.selectAll("g.group").remove();
// 	 svg_chord.selectAll("g.path").remove();
 	
/* Create/update "group" elements */
   	var groupG = svg_chord.selectAll("g.group") 
       	.data(layout.groups(), function (d) {
           // return d.index;
           return users[d.index];
           //use a key function in case the 
           //groups are sorted differently between updates
       });
       
   groupG.exit()
       .transition()
           .duration(chordDuration)
           .attr("opacity", 0)
           .remove(); //remove after transitions are complete
           
   var newGroups = groupG.enter().append("g")
       .attr("class", "group");
   //the enter selection is stored in a variable so we can
   //enter the <path>, <text>, and <title> elements as well

   //Create the title tooltip for the new groups
   newGroups.append("title");
   
   //Update the (tooltip) title text based on the data
   groupG.select("title")
       .text(function(d, i) {
           return parseInt(d.value) 
               + " calls from " 
               + "user " + users[i];
       });            

   //create the arc paths and set the constant attributes
   //(those based on the group index, not on the value)
   newGroups.append("path")
       .attr("id", function (d) {
           // return "group" + d.index;
           return "group" + users[d.index];
           //using d.index and not i to maintain consistency
           //even if groups are sorted
       })
       // .style("fill", function(d) { return fill(d.index); });
       .style("fill", function(d) { return fill(users[d.index]); });

 //update the paths to match the layout
  groupG.select("path") 
       .transition()
       .duration(chordDuration)
//       .attr("opacity", 0.5) //optional, just to observe the transition
       .attrTween("d", arcTween( last_layout ));
//       .transition().duration(100).attr("opacity", 1); //reset opacity
       
  //create the group labels
   newGroups.append("svg:text")
       .attr("xlink:href", function (d) {
           // return "#group" + d.index;
           return "#group" + users[d.index];
       })
       .attr("dy", ".35em")
       .attr("color", "#fff")
       //.attr("visibility", "hidden")
       .text(function (d) {
         if (users[d.index] == "0") {return "unknown user";}
       else {return "user " + users[d.index];} })
/*
        .attr("transform", function(d) {
               d.angle = (d.startAngle + d.endAngle) / 2;
               //store the midpoint angle in the data object
               
               return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                   " translate(" + (innerRadius + 30) + ")" + 
                   (d.angle > Math.PI ? " rotate(180)" : " rotate(0)"); 
               //include the rotate zero so that transforms can be interpolated
           })
        .attr("text-anchor", function (d) {
               return d.angle > Math.PI ? "end" : "begin";
           })
*/
       ;
     
   //position group labels to match layout
    groupG.select("text")
        .transition()
            .duration(chordDuration)
            .attr("transform", function(d) {
                d.angle = (d.startAngle + d.endAngle) / 2;
                //store the midpoint angle in the data object
                
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                    " translate(" + (innerRadius + 30) + ")" + 
                    (d.angle > Math.PI ? " rotate(180)" : " rotate(0)"); 
                //include the rotate zero so that transforms can be interpolated
            })
            .attr("text-anchor", function (d) {
                return d.angle > Math.PI ? "end" : "begin";
            })
//            .attr("visibility", "visible")
            ;
   
   /* Create/update the chord paths */
   var chordPaths = svg_chord.selectAll("path.chord")
       .data(layout.chords(), chordKey );
           //specify a key function to match chords
           //between updates 
   
 //create the new chord paths
   var newChords = chordPaths.enter()
       .append("path")
       .attr("class", "chord")
       .on("mouseover", function(d, i) {
         console.log("d:", d, "i:", i);
         setNetworkDetails(d,true) 
       })
       .on("mouseout", function(d) {
         clearNetworkDetails()
      })
      ;
   
   // Add title tooltip for each new chord.
   newChords.append("title");
   
   // Update all chord title texts
   chordPaths.select("title")
       .text(function(d) {
           if (users[d.target.index] !== users[d.source.index]) {
               return [parseInt(d.source.value),
                       " calls from ",
                       "user ", users[d.source.index],
                       " to ",
                       "user ", users[d.target.index],
                       "\n",
                       parseInt(d.target.value),
                       " calls from ",
                       "user ", users[d.target.index],
                       " to ",
                       "user ", users[d.source.index]
                       ].join(""); 
                   //joining an array of many strings is faster than
                   //repeated calls to the '+' operator, 
                   //and makes for neater code!
           } 
           else { //source and target are the same
               return parseInt(d.source.value) 
                   + " calls to/from " 
                   + "user " + users[d.source.index];
           }
       });

   //handle exiting paths:
   chordPaths.exit().transition()
       .duration(chordDuration)
       .attr("opacity", 0)
       .remove();

   //update the path shape
   chordPaths.transition()
       .duration(chordDuration)
 //      .attr("opacity", 0.5) //optional, just to observe the transition
       .style("fill", function(d) { return fill(users[d.source.index]); })
       .attrTween("d", chordTween(last_layout));
 //      .transition().duration(100).attr("opacity", 1); //reset opacity
   
   
   //add the mouseover/fade out behaviour to the groups
   //this is reset on every update, so it will use the latest
   //chordPaths selection
   groupG.on("mouseover", function(d) {
       chordPaths.classed("fade", function (p) {
           //returns true if *neither* the source or target of the chord
           //matches the group that has been moused-over
           // return ((p.source.index != d.index) && (p.target.index != d.index));
           return ((users[p.source.index] != users[d.index]) && (users[p.target.index] != users[d.index]));
       });
   });

   //the "unfade" is handled with CSS :hover class on g#circle
   //you could also do it using a mouseout event:
   /*
   g.on("mouseout", function() {
       if (this == g.node() )
           //only respond to mouseout of the entire circle
           //not mouseout events for sub-components
           chordPaths.classed("fade", false);
   });
   */
   
   last_layout = layout; //save for next update  

}
	
//////////////////////////////////////////////////////////////////////////////////////
//      END HELPER FUNCTIONS
//////////////////////////////////////////////////////////////////////////////////////
