var YmParser = d3.time.format("%Y.%m").parse;
var YmdParser = d3.time.format("%Y-%m-%d").parse;
var YmdXParser = d3.time.format("%Y-%m-%d %X").parse;
var formatPercent = d3.format(".0%");

var subjects, activities, calls, flusymptoms, health, musicgenreawareness, musicgenreimmersion, musicgenrepreference, politics, proximity,
    relationshipsfromsurveys, sms, wlan2;

    
// Formating the function signature like this so parts can easily be commented out.
// Need to be commented out in queue() and initVis.
var transformData = function(
                      error
                      ,subjects
                      ,activities
                      ,calls
                      ,flusymptoms
                      ,health
                      ,musicgenreawareness
                      ,musicgenreimmersion
                      ,musicgenrepreference
                      ,politics
//                      ,proximity
                      ,relationshipsfromsurveys
                      ,sms
                      ,wlan2
                      ) {
  if(error) {
    console.warn("Error", error);
    return;
  }
  
// Various transformations to our data

//  console.log("Subjects", subjects);
  console.log("Transforming Activities...");
  activities.map(function(d) {
      d["survey.month"] = YmParser(d["survey.month"]);
  });
//  console.log(activities);
//  console.log("Activities", activities);
  console.log("Transforming Calls...");
  calls.map(function(d) {
    d["time_stamp"] = YmdXParser(d["time_stamp"]);
  })
//  console.log("Calls", calls);
  console.log("Transforming FluSymptoms...");
  flusymptoms.map(function(d) {
    d["time"] = YmdXParser(d["time"]);
  })
//  console.log("FluSymptoms", flusymptoms);
  console.log("Transforming Health...");
  health.map(function(d) {
    d["survey.month"] = YmParser(d["survey.month"]);
  })
//  console.log("Health", health);
  console.log("Transforming MusicGeneAwareness...");
  musicgenreawareness.map(function(d) {
    d["date"] = YmdParser(d["date"]);
  })
//  console.log("MusicGenreAwareness", musicgenreawareness);
  console.log("Transforming MusicGeneImmersion...");
  musicgenreimmersion.map(function(d) {
    d["date"] = YmdParser(d["date"]);
  })
//  console.log("MusicGenreImmersion", musicgenreimmersion);
  console.log("Transforming MusicGenePreference...");
  musicgenrepreference.map(function(d) {
    d["date"] = YmdParser(d["date"]);
  })
//  console.log("MusicGenrePreference", musicgenrepreference);
  console.log("Transforming Politics...");
  politics.map(function(d) {
    d["survey.month"] = YmParser(d["survey.month"]);
  })
//  console.log("Politics", politics);
 /*
 console.log("Transforming Proximity...");
  proximity.map(function(d) {
    d["time"] = YmdXParser(d["time"]);
  });
  console.log("Proximity", proximity);
*/
  console.log("Transforming RelationshipsFromSurveys...");
  relationshipsfromsurveys.map(function(d) {
    d["survey.date"] = YmdParser(d["survey.date"]);
  })
//  console.log("RelationshipsFromSurveys", relationshipsfromsurveys);
  console.log("Transforming SMS...");
  sms.map(function(d) {
    d["time"] = YmdXParser(d["time"]);
  })
//  console.log("SMS", sms);
  console.log("Transforming WLAN2...");
  wlan2.map(function(d) {
    d["time"] = YmdXParser(d["time"]);
  })
  console.log("WLAN2", wlan2);

 // loadProximity();
}

// This is just a second function that can be used to load Proximity separately to see if the issue was the Queue.
// It's not, whether pulling by itself or in the queue, or even making a program that only pulls Proximity into a CSV, it causes
// the rest of the program to not function
function loadProximity() {
  d3.csv("data/Proximity2.csv", function(error, data) {
    if (error) {
      document.write("Error reading file");
      console.warn(error);
      return;
    }
    proximity = data;
    
    // transform proximity data
    console.log("Transforming Proximity...");
    proximity.map(function(d) {
      d["time"] = YmdXParser(d["time"]);
    });
  
    // log proximity data
    console.log("Proximity", proximity);
        
  }).on("progress", function(event) {
      console.log("Loading data/Proximity.csv: ", formatPercent(d3.event.loaded/d3.event.total));
  });
}

// load all of our data and show progress 
// based on http://bl.ocks.org/mbostock/3750941
function loadData() {
  
   queue()
  .defer(d3.csv("data/Subjects.csv")
         .on("progress", function() { console.log("Loading data/Subjects.csv: ",this.parent, formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/Activities.csv")
          .on("progress", function() { console.log("Loading data/Activities.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/Calls.csv")
         .on("progress", function() { console.log("Loading data/Calls.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/FluSymptoms.csv")
         .on("progress", function() { console.log("Loading data/FluSymptoms.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/Health.csv")
         .on("progress", function() { console.log("Loading data/Health.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/MusicGenreAwareness.csv")
         .on("progress", function() { console.log("Loading data/MusicGenreAwareness.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/MusicGenreImmersion.csv")
         .on("progress", function() { console.log("Loading data/MusicGenreImmersion.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/MusicGenrePreference.csv")
         .on("progress", function() { console.log("Loading data/MusicGenrePreference.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/Politics.csv")
         .on("progress", function() { console.log("Loading data/Politics.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
/*
  .defer(d3.csv("data/Proximity.csv")
         .on("progress", function() { console.log("Loading data/Proximity.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
*/
  .defer(d3.csv("data/RelationshipsFromSurveys.csv")
         .on("progress", function() { console.log("Loading data/RelationshipsFromSurveys.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error")
  .defer(d3.csv("data/SMS.csv")
         .on("progress", function() { console.log("Loading data/SMS.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                           
         .get, "error") 

  .defer(d3.csv("data/WLAN2.csv")
         .on("progress", function() { console.log("Loading data/WLAN2.csv: ", formatPercent(d3.event.loaded/d3.event.total)); })                                            
         .get)
         
  .await(transformData);
}

loadData();
