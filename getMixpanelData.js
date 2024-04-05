//getMixpanelData.js

//This library requires the API node library ($ npm install api --save)

//This async function will query the mixpanel database for session data from one or more account IDs between two dates. 
//Passing no date will just get all records since the beginning of the current year 
// @param {obj} objParameters -  A JSON object that includes all parameters including:
//      @param {string} mixpanel_userid - The Mixpanel account id (DOB + hash?) for member account to get data for; if passed it ignores the CLHID
//      @param {string} from_date (optional) - A string representation of the date to start looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the first day of the current year
//      @param {string} to_date (optional) - A string representation of the date to stop looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the day the query is run
// @return {object} the results of the query as a big JSON object
async function getMixpanelData(objParameters,funcResolve,funcReject) {

    //add debug function
    var dbg = require('./dbg.js');
    dbg("in getMixpanelData",2);
  
    //identify the final return object
    var objReturn = {"rtn":"error", "rtnmsg":"unknown error","rtnstack":[]};
    var dateNow = new Date();
    let currentDay= String(dateNow.getDate()).padStart(2, '0');
    let currentMonth = String(dateNow.getMonth()+1).padStart(2,"0");
    let currentYear = String(dateNow.getFullYear());
  
    if (objParameters.from_date === undefined) {
      objParameters.from_date = currentYear + '-01-01';
    }
    if (objParameters.to_date === undefined) {
      objParameters.to_date = currentYear + '-' + currentMonth + '-' + currentDay;
    }
  
    dbg(objParameters,4);
  
    let getIDPromise = new Promise(function(getIDResolve, getIDReject){
  
      if (objParameters.mixpanel_userid === undefined) {
        if (objParameters.CLHID === undefined) {
  
          objReturn.rtn="error";
          objReturn.rtnmsg = "no CLHID or Mixpanel ID passed";
    
          //reject the main promise
          funcReject(objReturn);
  
        } else {
          objReturn.CLHID = objParameters.CLHID;
          //getMixpanelID(db,objParameters.CLHID,getIDResolve, getIDReject);
        }
  
      } else {
        //don't need to get the mixpanel id from the database, we already have it
        objReturn.analyticsID = objParameters.mixpanel_userid;

        //just resolve this step
        getIDResolve(objReturn);
      }
  
  
    })
  
    // This is where the result of the promise calls back
    getIDPromise.then(
      function(objReturnID) {
        dbg("Mixpanel Analytics ID:" + objReturnID.analyticsID,2);
        var objReturn = {"rtn":"error", "rtnmsg":"unknown error","rtnstack":[]};
        objReturn.rtn = "ok";
        objReturn.rtnmsg = "success getting mixpanel id from CLHID" +  objReturn.analyticsID;
        objReturn.analyticsID = objReturnID.analyticsID;
  
        //call Mixpanel
        let getMixpanelDataPromise = new Promise(function(getDataResolve, getDataReject){
  
          callMixpanel(objReturn.analyticsID, objParameters.from_date, objParameters.to_date ,getDataResolve,getDataReject) 
      
        })
  
        //resolve Mixpanel call
        getMixpanelDataPromise.then(
          function (objReturnData){

            dbg("resolved getMixPanelData successfully",2);
  
            var objReturn = {"rtn":"error", "rtnmsg":"unknown error","rtnstack":[]};
            objReturn.rtn = "ok";
            objReturn.rtnmsg = "success getting mixpanel events for CLHID" +  objReturn.analyticsID;
            
            //add to the stack
            if (objReturnData.rtnstack) {
              objReturnData.rtnstack.push(objReturn);
              objReturn = objReturnData;
            } else {
              objReturn.data = objReturnData;
            }

            //dbg(JSON.stringify(objReturn),4);
  
            //resolved the main promise successfully
            funcResolve(objReturn);
  
          },
          function (objRejectData) {
            
            dbg("failure to resolve getMixPanelData",2);
            dbg(JSON.stringify(objRejectData),4);

            objReturn.rtn="error";
            objReturn.rtnmsg = "error getting mixpanel data";
            if (objRejectData.rtnstack) {
              objRejectData.rtnstack.push(objReturn);
              objReturn = objRejectData;

            } else {
              objReturn. data = objRejectData;
            }
      
            //reject the main promise
            funcReject(objReturn);
          }
  
        )
  
      },
      function(objRejectID) {
        dbg(objRejectID,2);
        objReturn.rtnstack.push(objRejectID);
        objReturn.rtn="error";
        objReturn.rtnmsg = "error getting mixpanel id";
  
        //reject the main promise
        funcReject(objReturn);
      }
    );
  
    dbg("Initial pass, promise set to getMixpanelData",4);
  
  }
  
  module.exports = getMixpanelData;





// === Separate Functions Below ===
  
/*

//This async function will make the call to Mixpanel
// @param {string} mixpanelID - The mixpanel id for the member account to get the data for
// @param {string} fromDate - A string representation of the date to start looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the first day of the current year
// @param {string} toDate - A string representation of the date to stop looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the day the query is run
// @return {object} the results of the query as a JSON object
async function callMixpanel(mixpanelID, fromDate, toDate ,funcResolve,funcReject) {

  //add debug function
  var dbg = require('./dbg.js');
  dbg("in callMixpanel",2);

  //This function uses this library
  //npm install api --save

  const sdk = require('api')('@mixpaneldevdocs/v3.22#7onfoghli0iftuo');

  //get credentials from local file not included in source control
  var config = require('./config.js');
  sdk.auth(config.mixpanelAccountID,config.mixpanelPassword); 
  var strProjectID = config.mixpanelProjectID;

  //!!! START HERE NEXT TIME
  // This is working! Now to clean it up, parse the data, and make it more reliable.
  // https://developer.mixpanel.com/reference/raw-event-export

  //This variable is used to hold the object returned from Mixpanel
  var objOutput = {};

   //call the async function as a promise
   let mixpanelPromise = new Promise(function(mixpanelResolve) {

    objOutput = sdk.rawEventExport({
      project_id: strProjectID,
      from_date: fromDate,
      to_date: toDate,
      //limit: '1000',
      where: 'properties["$user_id"] = "' + mixpanelID + '"',
      accept: 'text/plain'
    })

    //resolve the Mixpanel promise successfully
    mixpanelResolve(objOutput);

    //!!! I'm not sure why this works, but the promise never resolves to the fail state. 


  });

  //variables for the result of the promise
  var objReturn = {"rtn":"error", "rtnmsg":"unknown error","rtnstack":[]};
  var strOutputData = "";
  var arrRawEvents = [];
  var arrEvents = [];
      
  // This is where the result of the promise calls back
  mixpanelPromise.then(
    function(objMixpanelReturn) {

      //test to see if there is data or not
      if (objMixpanelReturn.length == 0) {
        dbg("error in callMixpanel function",0);
        dbg(JSON.stringify(objMixpanelReturn),0); 
        funcReject(objReturn);
      }

      strOutputData = objMixpanelReturn.data.toString();
      arrRawEvents = strOutputData.split("\n");

      for (var x=0;x<arrRawEvents.length-1;x++) {
        var objEvent = {};
        dbg(arrRawEvents[x],4);
        if (arrRawEvents[x] != "") {

          var objParsedEvent  = JSON.parse(arrRawEvents[x]);
          objEvent.event      = objParsedEvent.event;

          if (objParsedEvent.properties !== undefined) {

            if (objParsedEvent.properties.time !== undefined) {
              var iTimeStamp = objParsedEvent.properties.time;  //this is the number of seconds since 01/01/1970
              iTimeStamp = iTimeStamp * 1000;  //convert to milliseconds
              iTimeStamp = iTimeStamp + 25200000 //convert PST to UTC by adding seven hours in milliseconds

              var dteTimeStamp = new Date();
              dteTimeStamp.setTime(iTimeStamp);
              objEvent.time = dteTimeStamp.toISOString();
            }

            if (objParsedEvent.properties.current_page_name !== undefined) 
              objEvent.page       = objParsedEvent.properties.current_page_name;
            if (objParsedEvent.properties.page_from !== undefined) 
              objEvent.pagefrom   = objParsedEvent.properties.page_from;
            if (objParsedEvent.properties.role !== undefined) 
              objEvent.role       = objParsedEvent.properties.role;
          }

          arrEvents.push(objEvent);
        }

      }

      //add the events to the return object
      objReturn.data = arrEvents;

      //update the return object once all the work has been done successfully
      dbg("about to return from getMixpanelData call",4);
      objReturn.rtnmsg = "getMixpanelData called successfully";
      objReturn.rtn = "ok";

      //resolve the main promise
      funcResolve(objReturn);

    }
  );

  dbg("Initial pass, promise set to call the Mixpanel rawEventExport API",4);

}
  
*/


// !!! 2024.03.26 - No database to call this function, I'll keep it and put it back in later
/*

  //This async function will get the mixpanel ID from the CLHID
  // @param {string} CLHID - The CLHID for member account to get the mixpanel ID for
  // @return {object} the results of the query as a JSON object
  async function getMixpanelID(db, CLHID,funcResolve,funcReject) {
  
    //add debug function
    var dbg = require('./dbg.js');
    dbg("in getMixpanelID",2);
  
    //add sql library function
    var libQueries = require('./queries.js');
  
    //add query function
    var runQuery = require('./runQuery.js');
  
    //variables for the result of the promise
    var objReturn = {"rtn":"error", "rtnmsg":"unknown error"};
  
    //The query object
    var objQuery = {'title':'Mixpanel Analytics ID','query':libQueries.sqlAnalyticsId(CLHID)};
  
    //call the async function as a promise
    let myPromise = new Promise(function(QueryResolve, QueryReject) {
  
      //call the async function, passing the promise callbacks
      runQuery(db,objQuery,QueryResolve,QueryReject);  
  
      dbg("promise sent",4);
  
    });
      
    // This is where the result of the promise calls back
    myPromise.then(
  
      function(objReturnData) {
        dbg(objReturnData,3);
        objReturn.rtn = "ok";
        objReturn.rtnmsg = "success getting analytics ID from CLHID";
        objReturn.analyticsID = objReturnData.result[0].analytics_id;
        objReturn.rtnstack = new Array();
        objReturn.rtnstack.push(objReturnData);
        funcResolve(objReturn);
      },
      function(objReturnError) {
        dbg(objReturnError,3);
        funcReject(objReturnError);
      }
    );
  
  
    dbg("in getMixpanelID - finished first pass",4);
  
  }
  */
  


//This async function will make the call to Mixpanel
// @param {string} mixpanelID - The mixpanel id for the member account to get the data for
// @param {string} fromDate - A string representation of the date to start looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the first day of the current year
// @param {string} toDate - A string representation of the date to stop looking for events in the Mixpanel data in the format 'YYYY-MM-DD'; defaluts to the day the query is run
// @return {object} the results of the query as a JSON object
async function callMixpanel(mixpanelID, fromDate, toDate ,funcResolve,funcReject) {

  //add debug function
  var dbg = require('./dbg.js');
  dbg("in callMixpanel",2);

  //This function uses this library
  //npm install api --save

  const sdk = require('api')('@mixpaneldevdocs/v3.22#7onfoghli0iftuo');

  //get credentials from local file not included in source control
  var config = require('./config.js');
  sdk.auth(config.mixpanelAccountID,config.mixpanelPassword); 
  var strProjectID = config.mixpanelProjectID;

  //!!! START HERE NEXT TIME
  // This is working! Now to clean it up, parse the data, and make it more reliable.
  // https://developer.mixpanel.com/reference/raw-event-export

  //This variable is used to hold the object returned from Mixpanel
  var objOutput = {};

   //call the async function as a promise
   let mixpanelPromise = new Promise(function(mixpanelResolve, mixpanelReject) {

    objOutput = sdk.rawEventExport({
      project_id: strProjectID,
      from_date: fromDate,
      to_date: toDate,
      //limit: '1000',
      where: 'properties["$user_id"] = "' + mixpanelID + '"',
      accept: 'text/plain'
    })

    //resolve the Mixpanel promise successfully
    mixpanelResolve(objOutput);

    //!!! TODO: What if there is an error? We will need to call mixpanelReject!

  });

  //variables for the result of the promise
  var objReturn = {"rtn":"error", "rtnmsg":"unknown error","rtnstack":[]};
  objReturn.analyticsID = mixpanelID;
  var strOutputData = "";
  var arrRawEvents = [];
  var arrEvents = [];
      
  // This is where the result of the promise calls back
  mixpanelPromise.then(
    function(objMixpanelReturn) {

      strOutputData = objMixpanelReturn.data.toString();
      arrRawEvents = strOutputData.split("\n");

      for (var x=0;x<arrRawEvents.length-1;x++) {
        var objEvent = {};
        dbg(arrRawEvents[x],4);
        if (arrRawEvents[x] != "") {

          var objParsedEvent  = JSON.parse(arrRawEvents[x]);
          objEvent.event      = objParsedEvent.event;

          if (objParsedEvent.properties !== undefined) {

            if (objParsedEvent.properties.time !== undefined) {
              var iTimeStamp = objParsedEvent.properties.time;  //this is the number of seconds since 01/01/1970
              iTimeStamp = iTimeStamp * 1000;  //convert to milliseconds
              iTimeStamp = iTimeStamp + 25200000 //convert PST to UTC by adding seven hours in milliseconds

              var dteTimeStamp = new Date();
              dteTimeStamp.setTime(iTimeStamp);
              objEvent.time = dteTimeStamp.toISOString();
            }

            if (objParsedEvent.properties.current_page_name !== undefined) 
              objEvent.page       = objParsedEvent.properties.current_page_name;
            if (objParsedEvent.properties.page_from !== undefined) 
              objEvent.pagefrom   = objParsedEvent.properties.page_from;
            if (objParsedEvent.properties.role !== undefined) 
              objEvent.role       = objParsedEvent.properties.role;
          }

          arrEvents.push(objEvent);
        }

      }

      //add the events to the return object
      objReturn.data = arrEvents;

      //update the return object once all the work has been done successfully
      dbg("about to return from getMixpanelData call",1);
      objReturn.rtnmsg = "getMixpanelData called successfully";
      objReturn.rtn = "ok";

      //dbg(JSON.stringify(objReturn),4);

      //resolve the main promise
      funcResolve(objReturn);

    },
    function(objReturn) {
      dbg("error in callMixpanel function",0);
      dbg(objReturn,0); //write the return object to the console
      funcReject(objReturn);
    }
  );

  dbg("Initial pass, promise set to call the Mixpanel rawEventExport API",4);

}