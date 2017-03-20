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

function generateErrTableQuery(queryType,errorTypes){
  var AND  = ' AND '
  var WHERE = ' WHERE '
  var GROUP_BY = ' GROUP BY error_code'
  var query = '';
  var timeFilter = getTimeFilter();
  var testType = getTestType();
  var simulation  =  getSimulationName();
  var userCount = getUserCount();
 
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

    function appendUserCountValues(arr){
      var result;
      if(arr.length ==0){
        result = '';
      }else if (arr.length == 1){
        result = ' user_count= \'' + arr[0] + '\' ';
        result+=AND;
      }else{
        result = ' user_count=~ /^(';
        for (var i = 0; i < arr.length-1; i++){
            result += (arr[i] + '|');    
        }
        result+=(arr[arr.length-1]+ ')/ ');
        result+=AND;
      }
      return result;
    }
  
  testTypes = appendTestTypeValues(testType);
  userCounts = appendUserCountValues(userCount);
  simulation = ' simulation=\'' + simulation + '\'';

  if(queryType == 'details'){
    for(var i = 0; i < errorTypes.length; i++){
      errorType = '"error_type" = \'' + errorTypes[i] + '\' ';
      query += 'SELECT COUNT(error_type) AS error_count, FIRST(error_details) AS error_details  FROM "errors" ' + WHERE + errorType + AND + simulation + AND + testTypes + AND + userCounts +  timeFilter;// + GROUP_BY;
        if(i != errorTypes.length-1){
          query = query + "; ";
        }
      }  
    }else{
      query = 'SELECT COUNT(error_type) FROM "errors" '  + WHERE + simulation + AND + testTypes + AND + userCounts +  timeFilter;
      query +='; SELECT DISTINCT(error_type) AS error_type FROM "errors" ' + WHERE + simulation + AND + testTypes + AND + userCounts + timeFilter;
    }

  console.log(query)
  return query;
}
function formatErrorDetails(str){
    str = str.replace(/</g, '&lt');
    str = str.replace(/>/g, '&gt');
    return str;
}
//requests to DB
function getDistinctErrorTypes(distinctErrorTypesQuery){
  console.log("err count, distinct" )

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
      console.log('errorTypes ' + errorTypes)
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

function getErrorDetails(errorTypes,totalErrorCount){
    console.log("details" )
    
    function parseResponse(data){
        var results = data.results;
        console.log("results"  + results) 
        for(var i = 0; i < results.length; i++){
          var series = results[i].series
          if(typeof series == 'undefined'){
            showErrorTableMessage("Failed to retrieve error details.")
          }else{
            values = series[0].values[0];
            errorCount = values[1];
            errorDetails = formatErrorDetails(values[2]);
            errorPercentage = ((100 * errorCount) / totalErrorCount).toFixed(2);
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
  console.log("add row")
     $('#error-table').DataTable().row.add([errorDetails,errorCount,errorPercentage]).draw()
}
 
function initDataTable(table){
   console.log("init " )
     
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
  console.log("empty")
  if($('#error-table').length > 0){
      if ($.fn.DataTable.isDataTable('#error-table') ) {
      console.log("destroy")
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
    console.log('inited')
    var query = generateErrTableQuery()
    getDistinctErrorTypes(query)
  }else{
    console.log('not inited')
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

DB_NAME = getDatasourceDBName()//"perftest";
EPOCH = "ms";
DB_URL = getDatasourceDBURL()

$(document).ready(function(){
 console.log('ready') ;onPageRefresh ();
});

angular.element('grafana-app').injector().get('$rootScope').$on('refresh',function(){console.log('refresh scope');onPageRefresh ()});

</script>
<style>
 #error-table_filter,.dataTables_length{display:inline-block}.dataTables_length{padding-bottom:20px;padding-right:23px}input[type=search]{border-radius:5px}select[name=error-table_length]{height:23px;width:65px;border-radius:5px}.paging_full_numbers>a,.paging_full_numbers>span>a{padding-right:10px}#errors-table-message{display:table;margin-left:auto;margin-right:auto}#error-table{width:100%}th{text-align:center}table[id=error-table]>*>tr>td:nth-child(1){width:90%;word-break:break-all}table[id=error-table]>*>tr>td:nth-child(2),table[id=error-table]>*>tr>td:nth-child(3){width:5%;text-align:center}
</style>
<div id = "errors"></div>