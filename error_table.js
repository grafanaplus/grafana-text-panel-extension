<script type="text/javascript" language="javascript" src="//cdn.datatables.net/1.10.13/js/jquery.dataTables.min.js"/>
<script>
function formatTime(time){
  if(time.includes("now")){
    time = time.replace("now","now()");
    time = time.replace("-"," - ");
    time = time.replace("/"," / ");
  }else{
    time = time + "ms";
  }
    return time;
}

function getFromTime(timeObj){
  var from;
  if(typeof timeObj.from == "string"){
    from = timeObj.from;
  }else{
    from = timeObj.from._d.getTime().toString();
  }
 return formatTime(from);
}

function getToTime(timeObj){
  var to;
  if(typeof timeObj.to == "string"){
    to = timeObj.to;
  }else{
    to = timeObj.to._d.getTime().toString();
  }
  return formatTime(to);
}

function getTimeFilter(){
  var time = angular.element('grafana-app').injector().get('timeSrv').time;
  var from = getFromTime(time);
  var to = getToTime(time);
  var timeFilter = 'time > ' + from +' AND time < ' + to;

  return timeFilter;
}
 
function getTemplateVar(varName){
  var templateVars = angular.element('dashboard-submenu').injector().get('variableSrv').variables;
    for (var i = 0; i < templateVars.length; i++) {
        var tVar = templateVars[i];
        if( tVar.name == varName){
          return tVar;
        } 
       }        
  return null;
}

function getSimulationName (){
  return getTemplateVar('simulation').current.value;
}
 
function getTestType(){
  var testTypeObj = getTemplateVar('test_type');
  var res = [];
  var currentOption = (testTypeObj.current.value instanceof Array) ? testTypeObj.current.value[0] : testTypeObj.current.value;
  if(currentOption == '$__all'){
      var options = testTypeObj.options;
      for(var i = 1; i < options.length; i++){res.push(options[i].text);}
  }else if(testTypeObj.current.value instanceof Array){
      var values = testTypeObj.current.value;
      for(var i = 0; i < values.length; i++){res.push(values[i]);}
  }else{res.push(currentOption);}
 
  return res;
}
 
function getUserCount(){
  var userCountObj = getTemplateVar('user_count');
  var res = [];
  var currentOption = (userCountObj.current.value instanceof Array) ? userCountObj.current.value[0] : userCountObj.current.value;
  if(currentOption == '$__all'){
    return res;
  }else if(userCountObj.current.value instanceof Array){ 
    var values = userCountObj.current.value;
    for(var i = 0; i < values.length; i++){res.push(values[i]);}
  }else{res.push(currentOption);}
  
  return res;
}

function getEnvs(){
  var envObj = getTemplateVar('env');
  var res = [];
  var currentOption = (envObj.current.value instanceof Array) ? envObj.current.value[0] : envObj.current.value;
  if(currentOption == '$__all'){
    return res;
  }else if(envObj.current.value instanceof Array){ 
    var values = envObj.current.value;
    for(var i = 0; i < values.length; i++){res.push(values[i]);}
  }else{res.push(currentOption);}
  
  return res;
}

function generateErrTableQuery(queryType,errorTypes){
  console.log('generate query')
  var AND  = ' AND '
  var WHERE = ' WHERE '
  var GROUP_BY = ' GROUP BY error_code'
  var query = '';
  var timeFilter = getTimeFilter();
  var testType = getTestType();
  var simulation  =  getSimulationName();
  var userCount = getUserCount();
  var envs = getEnvs();

    function appendTestTypeValues(arr){
      var result = '';
      if (arr.length == 1){
        result = ' test_type= \'' + arr[0] + '\' ';
        
      }else{
        result = ' test_type=~ /^(';
        for (var i = 0; i < arr.length-1; i++){
            result += (arr[i] + '|');    
        }
        result+=(arr[arr.length-1]+ ')/ ');
      }
      return result;
    }

    function appendValues(name,arr){
      var result;
      if(arr.length ==0){
        result = '';
      }else if (arr.length == 1){
        result = name +'= \'' + arr[0] + '\' ';
        result+=AND;
      }else{
        result = name +'=~ /^(';
        for (var i = 0; i < arr.length-1; i++){
            result += (arr[i] + '|');    
        }
        result+=(arr[arr.length-1]+ ')$/ ');
        result+=AND;
      }
      return result;
    }
  testTypes = appendTestTypeValues(testType);
  environments = appendValues('env',envs);
  userCounts = appendValues('user_count',userCount);
  simulation = ' simulation=\'' + simulation + '\'';

  if(queryType == 'details'){
    for(var i = 0; i < errorTypes.length; i++){
      errorType = '"error_type" = \'' + errorTypes[i] + '\' ';
      query += 'SELECT COUNT(error_type) AS error_count, FIRST(gatling_error) AS gatling_error, FIRST(request_url) AS request_url,FIRST(request_params) AS request_params,FIRST(headers) AS headers,FIRST(http_code) AS http_code,FIRST(response) AS response,FIRST(request_name) AS request_name FROM "errors" ' + WHERE + errorType + AND + simulation + AND + testTypes + AND + userCounts + environments + timeFilter + "; ";
      }  
    }else{
      query = 'SELECT COUNT(error_type) FROM "errors" ' + WHERE + simulation + AND + testTypes + AND + userCounts + environments +  timeFilter;
      query +='; SELECT DISTINCT(error_type) AS error_type FROM "errors" ' + WHERE + simulation + AND + testTypes + AND + userCounts + environments + timeFilter;
    }
 
  return query;
}
function formatErrorDetails(str){
    str = str.replace(/</g, '&lt');
    str = str.replace(/>/g, '&gt');
    return str;
}
//requests to DB
function getDistinctErrorTypes(distinctErrorTypesQuery){
  function getTotalErrorCount(data){
    var series = data.results[0].series
    var errorCount = 0;
    if(typeof series != 'undefined'){
      errorCount = series[0].values[0][1];
    }
    return errorCount
  }

  function getErrorTypes(data){
     var series = data.results[1].series
    if(typeof series == 'undefined'){
        showErrorTableMessage("No error codes in errors database.")
     }else{
        var errorTypes  = [];
        var values = series[0].values;
        for(var i = 0; i < values.length; i++){
            errorTypes.push(values[i][1]);
        }
    }
      return errorTypes        
  }

    $.get(DB_URL, { q: distinctErrorTypesQuery, db: DB_NAME, epoch: EPOCH},
    function(data, status){
          if(status == 'success'){
                var totalErrorCount = getTotalErrorCount(data)
                if(totalErrorCount > 0){
                  var errorTypes  = getErrorTypes(data)
                  getErrorDetails(errorTypes,totalErrorCount)
                }else{
                    showErrorTableMessage("No errors in selected timeframe. Change filter parameters.")
                }
          }else{
            showErrorTableMessage("Error occured during quering data. Check your datasource settings.")
          }
    });
}

function generateDetailBox(request_name,gatling_error,gatling_error_short,request_url,request_params,request_header,http_code,response){
  var box = "<div class=\"accordeon\"><div class=\"accordeon-title\"><div id=\"title-wrapper\" data-title=\"" + 
  gatling_error + "\">" + request_name  + " error: " + 
  gatling_error_short + "</div></div><div class=\"accordeon-content\"><div class=\"separator\"><div id=\"detail-label\">Request URL:</div><div id=\"detail-data\">" + 
  request_url+ "</div></div><div class=\"separator\"><div id=\"detail-label\">Request params:</div><div id=\"detail-data\">" + 
  request_params + "</div></div><div class=\"separator\"><div id=\"detail-label\">Request headers:</div><div id=\"detail-data\">" + 
  request_header + "</div></div><div class=\"separator\"><div id=\"detail-label\">HTTP Code:</div><div id=\"detail-data\">" + 
  http_code + "</div></div><div class=\"separator\"><div id=\"detail-label\">Response:</div><div id=\"detail-data\">" + 
  response + "</div></div></div></div>"

  return box;
}

function getErrorDetails(errorTypes,totalErrorCount){
    
    function parseResponse(data){
        var results = data.results;
        for(var i = 0; i < results.length; i++){
          var series = results[i].series
          if(typeof series == 'undefined'){
            showErrorTableMessage("Failed to retrieve error details.")
          }else{
             
            var values = series[0].values[0];
            var errorCount = values[1];
            //errorDetails = formatErrorDetails(values[2]);
            var request_name = values[8];
            var gatling_error = values[2];
            var gatling_error_short  = values[2]
            var request_url =  values[3];
            var request_params = values[4];
            var request_header = values[5];
            var http_code = values[6];
            var response = values[7];
            var request_name = values[8];
            var errorDetails = generateDetailBox(request_name,gatling_error,gatling_error_short,request_url,request_params,request_header,http_code,response);
            var errorPercentage = ((100 * errorCount) / totalErrorCount).toFixed(2);
            appendRow(errorDetails,errorCount,errorPercentage)
          }
      }
    }
    generateErrorTable();
    query = generateErrTableQuery('details',errorTypes)
    $.get(DB_URL, { q: query, db: DB_NAME, epoch: EPOCH},
        function(data, status){
          if(status == 'success'){
            parseResponse(data)
          }else{showErrorTableMessage("Error occured during quering data. Check your datasource settings.")}
    });
 
}

function appendRow(errorDetails,errorCount,errorPercentage){
     $('#error-table').DataTable().row.add([errorDetails,errorCount,errorPercentage]).draw()
     initAccordeon()
}
 
function initDataTable(table){
     table.DataTable({
            "empty": true,
            "lengthMenu": [[5, 10, 20, -1], [5, 10, 20, "All"]],
            "order": [[ 2, "desc" ]],
            "pagingType": "full_numbers",
            "responsive": true
      });
}

function showErrorTableMessage(mess){
    emptyErrorTable()
    message = $('<span>');
    message.attr("id","errors-table-message");
    message.text(mess)
    $("#errors").append(message);
}
 
function emptyErrorTable(){
  if($('#error-table').length > 0){
      if ($.fn.DataTable.isDataTable('#error-table') ) {
        $('#error-table').DataTable().destroy();
    }
  }
   $("#errors").empty();
}

function generateErrorTable(){
  emptyErrorTable();
  var table = $('<table>');
  table.attr("id","error-table");
  table.append(generateErrorTableHead());
  table.append(generateErrorTableBody());
  $('#errors').append(table);
  initDataTable(table);
  addSelectionFeature();
}

function initAccordeon(){
  $('.accordeon-title').on('click',function(){
    var title = $(this);
    if(title.hasClass('is-opened')){
        title.next('.accordeon-content').slideUp(function(){
        $(this).prev('.accordeon-title').removeClass('is-opened');
      })
    }else{
      var content = title.next('.accordeon-content'); 
      if (!content.is(':visible')) {
        content.slideDown(function(){title.addClass('is-opened')});
      } 
    }
  })
  $('#error-table_paginate a').click(function(){initAccordeon()})
}

function generateErrorTableHead(){
      var cellNames = ["Error Details","Count","Percentage"];
      tHead = $('<thead>')
      tHead.attr("id","error-table-head");
      tRow = $('<tr>');
      for (var i = 0; i < cellNames.length; i++){
          tHeadCell = $('<th>');
          tHeadCell.text(cellNames[i])
          tRow.append(tHeadCell);
      }
      tHead.append(tRow);

      return tHead;
}
function addSelectionFeature(){
    var table = $('#error-table').DataTable();
    $('#error-table tbody').on( 'click', 'tr', function () {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        }
        else {
            table.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }
    } );
 
    $('#button').click( function () {
        table.row('.selected').remove().draw( false );
    } );
}

function generateErrorTableBody(){
    var tBody = $('<tbody>');
    tBody.attr("id","error-table-body");

    return tBody;
}

function checkDataTableIsLoaded(){
  if($.fn.DataTable){
    var query = generateErrTableQuery()
    getDistinctErrorTypes(query)
  }else{
    setTimeout(function() { checkDataTableIsLoaded()}, 500);
  }
}
 
function onPageRefresh (){
    checkDataTableIsLoaded()
}

function getDatasourceDBURL(){
  return angular.element('grafana-app').injector().get('datasourceSrv').getAll().GatlingDB.url + '/query';
}

function getDatasourceDBName(){
  return angular.element('grafana-app').injector().get('datasourceSrv').getAll().GatlingDB.database;
}

DB_NAME = "perftest"; //getDatasourceDBName()//
EPOCH = "ms";
DB_URL = "http://10.192.122.105:7777/query" //getDatasourceDBURL()

$(document).ready(function(){
onPageRefresh ();
});

angular.element('grafana-app').injector().get('$rootScope').$on('refresh',function(){onPageRefresh ()});

</script>
<style>
 #error-table_filter,.dataTables_length{display:inline-block}.dataTables_length{padding-bottom:20px;padding-right:23px}input[type=search]{border-radius:5px}select[name=error-table_length]{height:23px;width:65px;border-radius:5px}.paging_full_numbers>a,.paging_full_numbers>span>a{padding-right:10px}#errors-table-message{display:table;margin-left:auto;margin-right:auto}#error-table{width:100%}th{text-align:center}table[id=error-table]>*>tr>td:nth-child(1){width:90%;word-break:break-all}table[id=error-table]>*>tr>td:nth-child(2),table[id=error-table]>*>tr>td:nth-child(3){width:5%;text-align:center}
.accordeon {
  width: 100%;
 font-family: helvetica, sans-serif;
  margin: -7px;
    margin-left: 0px;}
.accordeon-title {
    background-color: #1f1d1d;
    padding-top: 10px;
    cursor: pointer;
    padding-bottom: 10px;
}
.accordeon-title:before {
  content: "+";
  float: left;
  font-size: 20px;
  color: #f2f2f2;
  border: 1px solid #f2f2f2;
  width: 20px;
  height: 20px;
  line-height: 17px;
  text-align: center;
  margin-right: 10px;
}

.accordeon-title.is-opened:before {
  content: "-";
}
 
table[class=error-details-table]>*>tr>td:nth-child(1){
  width:12%;
  border-right-color: white;

}
.accordeon-content>.separator:last-child{
  border-bottom: 0px;
  margin-bottom: 0px;
}
table[class=error-details-table]{
    border: none;
}
.accordeon-content {
  display: none;
  padding-left: 20px;
  padding-bottom:10px;
} 
#detail-label{
  display: inline-block;
    vertical-align: top;
    width: 10%;
    max-width: 135px;
    word-break: break-word;
    padding: 10px;
    border-right: 1px solid #292929;
}
#detail-data{
    border-left: 1px solid #292929;
    display: inline-block;
    word-break: break-all;
    padding: 10px;
    width: 90%;
    margin-left: -1px;
    max-height: 75px;
    overflow: hidden;
}
#title-wrapper{
  height: 20px;
  overflow: hidden;
}
.separator{
  display:block;
  border-bottom: 1px solid #292929;
  margin-bottom: -7px;
}
</style>
<div id = "errors"></div>