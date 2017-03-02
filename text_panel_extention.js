<script>
//table sorter logic
(function(c){c.fn.stupidtable=function(b){return this.each(function(){var a=c(this);b=b||{};b=c.extend({},c.fn.stupidtable.default_sort_fns,b);a.data("sortFns",b);a.on("click.stupidtable","thead th",function(){c(this).stupidsort()})})};c.fn.stupidsort=function(b){var a=c(this),g=0,f=c.fn.stupidtable.dir,e=a.closest("table"),k=a.data("sort")||null;if(null!==k){a.parents("tr").find("th").slice(0,c(this).index()).each(function(){var a=c(this).attr("colspan")||1;g+=parseInt(a,10)});var d;1==arguments.length?
d=b:(d=b||a.data("sort-default")||f.ASC,a.data("sort-dir")&&(d=a.data("sort-dir")===f.ASC?f.DESC:f.ASC));if(a.data("sort-dir")!==d)return a.data("sort-dir",d),e.trigger("beforetablesort",{column:g,direction:d}),e.css("display"),setTimeout(function(){var b=[],l=e.data("sortFns")[k],h=e.children("tbody").children("tr");h.each(function(a,d){var e=c(d).children().eq(g),f=e.data("sort-value");"undefined"===typeof f&&(f=e.text(),e.data("sort-value",f));b.push([f,d])});b.sort(function(a,b){return l(a[0],
b[0])});d!=f.ASC&&b.reverse();h=c.map(b,function(a){return a[1]});e.children("tbody").append(h);e.find("th").data("sort-dir",null).removeClass("sorting-desc sorting-asc");a.data("sort-dir",d).addClass("sorting-"+d);e.trigger("aftertablesort",{column:g,direction:d});e.css("display")},10),a}};c.fn.updateSortVal=function(b){var a=c(this);a.is("[data-sort-value]")&&a.attr("data-sort-value",b);a.data("sort-value",b);return a};c.fn.stupidtable.dir={ASC:"asc",DESC:"desc"};c.fn.stupidtable.default_sort_fns=
{"int":function(b,a){return parseInt(b,10)-parseInt(a,10)},"float":function(b,a){return parseFloat(b)-parseFloat(a)},string:function(b,a){return b.toString().localeCompare(a.toString())},"string-ins":function(b,a){b=b.toString().toLocaleLowerCase();a=a.toString().toLocaleLowerCase();return b.localeCompare(a)}}})(jQuery);
    
function addTableSort(table){
      var moveBlanks = function(a, b) {
        if ( a < b ){
          if (a == "")
            return 1;
          else
            return -1;
        }
        if ( a > b ){
          if (b == "")
            return -1;
          else
            return 1;
        }
        return 0;
      };
      var moveBlanksDesc = function(a, b) {
        if ( a < b )
          return 1;
        if ( a > b )
          return -1;
        return 0;
      };
      table.stupidtable({
        "moveBlanks": moveBlanks,
        "moveBlanksDesc": moveBlanksDesc,
      });
      
      table.on("aftertablesort", function (event, data) {
        var th = $(this).find("th");
        th.find(".arrow").remove();
        var dir = $.fn.stupidtable.dir;
        var arrow = data.direction === dir.ASC ? "&uarr;" : "&darr;";
        th.eq(data.column).append('<span class="arrow">' + arrow +'</span>');
    
      });    
} 
//work with time interval 
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

//template vars extraction
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
//get selected simulation
function getSimulationName (){
  var res = getTemplateVar('simulation').current.value;
  return res;
}
//get selected test types 
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
//get user count
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

//generate query 
function generateQuery(status, testType, simulation, userCount, timeFilter){
  var AND  = ' AND '
  var WHERE = ' WHERE '
  var GROUP_BY = ' GROUP BY request_name'

    function appendTestTypeValues(arr){
      var result = ''
      for (var i = 0; i < arr.length; i++){
        result += arr[i];
        if(i+1 < arr.length){
          result += ',';
        }   
      }
      return result;
     }

    function appendUserCountValues(arr){
        var result = '';
        if (arr.length > 0){
          result = ' user_count= \'' + arr[0] + '\' ';
            if(arr.length > 1){
              for (var i = 1; i < arr.length; i++){
                result += (' OR user_count= \'' + arr[i] + '\' ');    
              }
          
          }
          result = result + AND;
        }
        return result;
    }
  var query;
  var testTypes = appendTestTypeValues(testType);
  var userCounts = appendUserCountValues(userCount);
  var simulation = ' simulation=\'' + simulation + '\'';
  if(status == 'all'){
    query = 'SELECT SUM(count) AS "total", MEAN(count) AS "rps", MIN(min) AS "min", MEDIAN(mean) AS "median", MEAN(mean) AS "average", MAX(max) AS "max", STDDEV(mean) AS "stddev", PERCENTILE(mean,75) AS "perc75", PERCENTILE(mean,95) AS "perc95", PERCENTILE(mean,99) AS "perc99" FROM ' + 
      testTypes + WHERE + simulation + AND + userCounts + 'status= \'all\'' + AND +  timeFilter + GROUP_BY;
  }else if(status == 'ok'){
    query = 'SELECT SUM(count) AS "ok" FROM ' + testTypes + WHERE + simulation + AND + userCounts + 'status= \'ok\'' + AND + timeFilter + GROUP_BY;
  }

  return query;
}

function parseResponse(series){
  if(series != undefined ){
    for(var i = 0; i < series.length; i++){
      var serie = series[i];
      var requestName = serie.tags.request_name;
      var columns = serie.columns;
      var values = serie.values[0];

        for(var j = 1; j < series.length; j++){
          value = values[j]
          column = columns[j]
          if(value != null){
            var cellId = requestName + '_' + column;
            var cell = $('#' + cellId)
              if (column == 'rps'){
                value = parseFloat(value).toFixed(2)
              }else if(TABLE_TIME_EPOCH == 's'){
                  if (column != 'total' & column != 'ok'){
                      assignRTCellStyle(cell,value);
                      value = parseFloat(value/1000).toFixed(2);
                  }
              }else  {
                value = parseInt(value);
              }
              cell.text(value);
          }
        }
    }
  }
}

function assignRTCellStyle(cell,value){
  if(value > HIGHER_RT_TRESHOLD){
      cell.attr("id","red");
  }else if(value < LOWER_RT_TRESHOLD){
      cell.attr("id","green");
  }else{
      cell.attr("id","yellow");
  }
}
function assignErrorCellStyle(cellKO,cellKOPerc,value){
  if(value == 0){
      cellKOPerc.attr("id","green");
      cellKO.attr("id","green");
  }else if(value >= ERROR_PERC_TRESHOLD){
      cellKOPerc.attr("id","red");
      cellKO.attr("id","red");
  }else{
      cellKOPerc.attr("id","yellow");
      cellKO.attr("id","yellow");
  }
}

function getRequestNames(series){
 if(series != undefined ){
    let set = new Set();
     for(var i = 0; i < series.length; i++){
      set.add(series[i].tags.request_name);
      }
    return Array.from(set.values());
  }
}

//send queries 
function getAllMetrics(query){
  $.get(DB_URL, { q: query, db: DB_NAME, epoch: EPOCH},
    function(data, status){
          if(status == 'success'){
            var series = data.results[0].series
              if(typeof series == 'undefined'){
                showErrMessage("No datapoints in selected time range. Try to change filter parameters.")
              }else{
                parseResponse(series);
                countKOMetrics();
              }
          }else{
            showErrMessage("Error occured during quering data. Check your datasource settings.")
          }
      });
}

function getOkMetrics(queryOK,queryALL){
  $.get(DB_URL, { q: queryOK, db: DB_NAME, epoch: EPOCH},
    function(data, status){
          if(status == 'success'){
            var series = data.results[0].series
              if(typeof series == 'undefined'){
                showErrMessage("No datapoints in selected time range. Try to change filter parameters.");
              }else{
                requestNames = getRequestNames(series);
                generateTable(requestNames);
                getAllMetrics(queryALL);
                parseResponse(series);
              }
          }else{
            showErrMessage("Error occured during quering data. Check your datasource settings.")
          }
      });
}

function countKOMetrics(){
  var res = $('[id$="_ok"]');
  for (var i = 0; i < res.length; i++){
    var id = res[i].id;
    var request_name = id.substring(0, id.length -2);
    var koPercCell = $('#' + request_name + 'ko_perc')
    var koCell = $('#' + request_name + 'ko')
    var okValue = parseInt(res[i].textContent);
    var totalValue = $('#' + request_name + 'total')[0].textContent;
    var koValue = totalValue - okValue;
    var kopercValue = 0
    if(koValue > 0){
      kopercValue = ((100 * koValue) / totalValue).toFixed(2);
    }
    assignErrorCellStyle(koPercCell,koCell,kopercValue);
    koPercCell.text(kopercValue);
    koCell.text(koValue);
  }
}

//work with summary table
function emptySummaryTable(){
   $("#summary").empty();
}

function generateTable(requestNames){
  emptySummaryTable();
  var table = $('<table>');
  addTableSort(table);
  table.attr("id","summary-table");
  table.append(generateTableHead());
  table.append(generateTableBody (requestNames));
 
  $('#summary').append(table);
  $('#summary-table-body tr').click(function(e) {
    $('#summary-table-body tr').removeClass('selected');
    $(this).addClass('selected');
  })
}

function generateTableHead(){

  var dataSort = ["string-ins","int","int","int","float","float","int","int","int","int","int","int","int","int"];
  var cellNames = ["Requests","Total","OK","KO","% KO","Req/s","Min","50th pct","75th pct","95th pct","99th pct","Max","Average","Std Dev"];
  tHead = $('<thead>')
  tHead.attr("id","summary-table-head");
  tRow = $('<tr>');

  for (var i = 0; i < cellNames.length; i++){
      tHeadCell = $('<th>');
      tHeadCell.attr("data-sort",dataSort[i]);
      tHeadCell.html(cellNames[i]);
      tRow.append(tHeadCell);
  }
  tHead.append(tRow);

  return tHead;
}

function generateTableBody (requestNames){
    
    var tBody = $('<tbody>');
    tBody.attr("id","summary-table-body");

    for (var i = 0; i < requestNames.length; i++ ) {
        tRow = $('<tr>');
        for (var j = 0; j < CALCULATIONS.length; j++ ){
            tCell = $('<td>');
            if(j==0){
              tCell.html(requestNames[i])
            } 
            cellId = requestNames[i]+ '_' + CALCULATIONS[j];
            tCell.attr("id",cellId);
            tRow.append(tCell);
        }
        tBody.append(tRow);
    }

    return tBody;
}

function showErrMessage(errMessage){
  $("#summary").empty();
  message = $('<span>');
  message.attr("id","summary-table-message");
  message.text(errMessage)
  $("#summary").append(message);
}

// main function 
function onRefresh () {
  var timeFilter = getTimeFilter();
 // var requestNames = getRequestNames();
  var testType = getTestType();
  var simulation  =  getSimulationName();
  var userCount = getUserCount();
  queryAll = generateQuery('all',testType, simulation, userCount,timeFilter);
  queryOk = generateQuery('ok',testType, simulation, userCount,timeFilter);
  
  getOkMetrics(queryOk,queryAll);
}


//some global vars
DB_NAME = "perftest";
EPOCH = "ms";
DB_URL = "http://10.192.122.105:7777/query";
CALCULATIONS = ["request", "total", "ok", "ko", "ko_perc","rps", "min", "median", "perc75", "perc95", "perc99", "max", "average", "stddev"];
TABLE_TIME_EPOCH = 's'; //s for seconds, any other value for milliseconds

//threshold values

LOWER_RT_TRESHOLD = 2000
HIGHER_RT_TRESHOLD = 3000
ERROR_PERC_TRESHOLD = 1

window.onload = onRefresh();
angular.element('grafana-app').injector().get('$rootScope').$on('refresh',function(){onRefresh()});
 
</script>
  <style type="text/css">
    th[data-sort]{
      cursor:pointer;
    }
    tr.selected{
      color: #d8d9da;
      font-weight: bold;
      background: #292929;
    }
    table {
       width: 100%;
    }
    tr:hover{
      background:#292929;
    }
    #summary-table-message {
      display: table;
      margin-left: auto;
      margin-right: auto;
    }
    #hidden {
      display: none;
    }
    #red{
      background-color:#f64a4a; //red
    }
    #yellow{
      background-color:#e9893a; // yellow
    }
    #green{
      background-color:#37ad32; //green
    }
</style>

<div id = "summary"></div>


