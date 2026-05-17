/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 97.61904761904762, "KoPercent": 2.380952380952381};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8452380952380952, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "仿真背书统一申请查询"], "isController": false}, {"data": [1.0, 500, 1500, "设置turbo持票标识"], "isController": false}, {"data": [1.0, 500, 1500, "仿真解质押签收查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真贴现统一签收查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真登录"], "isController": false}, {"data": [1.0, 500, 1500, "仿真提示收票统一申请"], "isController": false}, {"data": [0.5, 500, 1500, "仿真质押统一签收查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真质押统一申请查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真转贴现对话报价挑票"], "isController": false}, {"data": [1.0, 500, 1500, "仿真提示收票统一签收查询"], "isController": false}, {"data": [1.0, 500, 1500, "bemp获取安全key-SM4加密模式"], "isController": false}, {"data": [1.0, 500, 1500, "bemp买入跟踪查询票据详情"], "isController": false}, {"data": [1.0, 500, 1500, "仿真质押统一申请"], "isController": false}, {"data": [1.0, 500, 1500, "仿真背书统一签收查询"], "isController": false}, {"data": [0.0, 500, 1500, "bemp提交申请"], "isController": false}, {"data": [1.0, 500, 1500, "仿真解质押统一申请查询"], "isController": false}, {"data": [0.5, 500, 1500, "仿真承兑统一申请查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真承兑统一申请"], "isController": false}, {"data": [0.5, 500, 1500, "仿真提示收票统一签收"], "isController": false}, {"data": [1.0, 500, 1500, "仿真背书转让统一申请"], "isController": false}, {"data": [0.5, 500, 1500, "bemp买入跟踪查询批次信息"], "isController": false}, {"data": [1.0, 500, 1500, "仿真解质押统一申请"], "isController": false}, {"data": [1.0, 500, 1500, "仿真转贴现对话报价申请"], "isController": false}, {"data": [1.0, 500, 1500, "仿真出票登记"], "isController": false}, {"data": [0.5, 500, 1500, "仿真质押统一签收"], "isController": false}, {"data": [0.5, 500, 1500, "仿真背书统一签收"], "isController": false}, {"data": [0.5, 500, 1500, "仿真承兑统一签收"], "isController": false}, {"data": [1.0, 500, 1500, "调试取样器"], "isController": false}, {"data": [1.0, 500, 1500, "仿真提示收票统一申请查询"], "isController": false}, {"data": [0.5, 500, 1500, "仿真贴现统一申请"], "isController": false}, {"data": [1.0, 500, 1500, "仿真贴现统一申请查询"], "isController": false}, {"data": [1.0, 500, 1500, "仿真承兑统一签收查询"], "isController": false}, {"data": [0.5, 500, 1500, "bemp登录-SM4加密模式"], "isController": false}, {"data": [0.5, 500, 1500, "仿真解质押统一签收"], "isController": false}, {"data": [1.0, 500, 1500, "bemp资产分类设置"], "isController": false}, {"data": [0.5, 500, 1500, "仿真贴现统一签收"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 42, 1, 2.380952380952381, 376.6904761904763, 0, 977, 323.5, 856.4000000000001, 974.85, 977.0, 0.32019760766644556, 1.1585572572406588, 0.3065656829166952], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["仿真背书统一申请查询", 1, 0, 0.0, 197.0, 197, 197, 197.0, 197.0, 197.0, 197.0, 5.076142131979695, 29.733105964467004, 4.8828125], "isController": false}, {"data": ["设置turbo持票标识", 6, 0, 0.0, 4.333333333333334, 0, 23, 0.5, 23.0, 23.0, 23.0, 0.06656386247906011, 0.0, 0.0], "isController": false}, {"data": ["仿真解质押签收查询", 1, 0, 0.0, 285.0, 285, 285, 285.0, 285.0, 285.0, 285.0, 3.5087719298245617, 20.096628289473685, 3.0736019736842106], "isController": false}, {"data": ["仿真贴现统一签收查询", 1, 0, 0.0, 276.0, 276, 276, 276.0, 276.0, 276.0, 276.0, 3.6231884057971016, 20.80856544384058, 3.1738281249999996], "isController": false}, {"data": ["仿真登录", 2, 0, 0.0, 389.5, 369, 410, 389.5, 410.0, 410.0, 410.0, 0.06772544106193491, 0.01567473587077986, 0.08551659696590025], "isController": false}, {"data": ["仿真提示收票统一申请", 1, 0, 0.0, 413.0, 413, 413, 413.0, 413.0, 413.0, 413.0, 2.4213075060532687, 0.4634533898305085, 1.7143046307506054], "isController": false}, {"data": ["仿真质押统一签收查询", 1, 0, 0.0, 802.0, 802, 802, 802.0, 802.0, 802.0, 802.0, 1.2468827930174564, 7.1001694981296755, 1.0922401028678304], "isController": false}, {"data": ["仿真质押统一申请查询", 1, 0, 0.0, 181.0, 181, 181, 181.0, 181.0, 181.0, 181.0, 5.524861878453039, 32.30749309392265, 5.400768301104972], "isController": false}, {"data": ["仿真转贴现对话报价挑票", 1, 0, 0.0, 398.0, 398, 398, 398.0, 398.0, 398.0, 398.0, 2.512562814070352, 2.3898790829145726, 2.5297385364321605], "isController": false}, {"data": ["仿真提示收票统一签收查询", 1, 0, 0.0, 372.0, 372, 372, 372.0, 372.0, 372.0, 372.0, 2.688172043010753, 15.380859375, 2.3547757056451615], "isController": false}, {"data": ["bemp获取安全key-SM4加密模式", 1, 0, 0.0, 362.0, 362, 362, 362.0, 362.0, 362.0, 362.0, 2.7624309392265194, 2.4791738604972378, 5.044673687845304], "isController": false}, {"data": ["bemp买入跟踪查询票据详情", 1, 0, 0.0, 190.0, 190, 190, 190.0, 190.0, 190.0, 190.0, 5.263157894736842, 21.073190789473685, 10.346422697368421], "isController": false}, {"data": ["仿真质押统一申请", 1, 0, 0.0, 284.0, 284, 284, 284.0, 284.0, 284.0, 284.0, 3.5211267605633805, 0.6739656690140846, 4.999724911971831], "isController": false}, {"data": ["仿真背书统一签收查询", 1, 0, 0.0, 320.0, 320, 320, 320.0, 320.0, 320.0, 320.0, 3.125, 17.8558349609375, 2.7374267578125], "isController": false}, {"data": ["bemp提交申请", 1, 1, 100.0, 673.0, 673, 673, 673.0, 673.0, 673.0, 673.0, 1.4858841010401187, 1.8646104197622584, 2.7323435178306092], "isController": false}, {"data": ["仿真解质押统一申请查询", 1, 0, 0.0, 256.0, 256, 256, 256.0, 256.0, 256.0, 256.0, 3.90625, 23.58245849609375, 3.70025634765625], "isController": false}, {"data": ["仿真承兑统一申请查询", 1, 0, 0.0, 974.0, 974, 974, 974.0, 974.0, 974.0, 974.0, 1.026694045174538, 57.78663212268994, 0.9695440836755647], "isController": false}, {"data": ["仿真承兑统一申请", 1, 0, 0.0, 261.0, 261, 261, 261.0, 261.0, 261.0, 261.0, 3.8314176245210727, 0.7333572796934865, 2.649066091954023], "isController": false}, {"data": ["仿真提示收票统一签收", 1, 0, 0.0, 518.0, 518, 518, 518.0, 518.0, 518.0, 518.0, 1.9305019305019306, 0.4109857625482625, 1.3159085424710424], "isController": false}, {"data": ["仿真背书转让统一申请", 1, 0, 0.0, 298.0, 298, 298, 298.0, 298.0, 298.0, 298.0, 3.3557046979865772, 0.6423028523489933, 5.158085151006712], "isController": false}, {"data": ["bemp买入跟踪查询批次信息", 1, 0, 0.0, 506.0, 506, 506, 506.0, 506.0, 506.0, 506.0, 1.976284584980237, 9.254184165019764, 4.290313117588933], "isController": false}, {"data": ["仿真解质押统一申请", 1, 0, 0.0, 179.0, 179, 179, 179.0, 179.0, 179.0, 179.0, 5.58659217877095, 1.069308659217877, 3.758947276536313], "isController": false}, {"data": ["仿真转贴现对话报价申请", 1, 0, 0.0, 220.0, 220, 220, 220.0, 220.0, 220.0, 220.0, 4.545454545454545, 0.8700284090909091, 5.890447443181818], "isController": false}, {"data": ["仿真出票登记", 1, 0, 0.0, 180.0, 180, 180, 180.0, 180.0, 180.0, 180.0, 5.555555555555555, 1.0633680555555556, 9.64626736111111], "isController": false}, {"data": ["仿真质押统一签收", 1, 0, 0.0, 977.0, 977, 977, 977.0, 977.0, 977.0, 977.0, 1.0235414534288638, 0.21790237973387921, 0.6976874360286591], "isController": false}, {"data": ["仿真背书统一签收", 1, 0, 0.0, 566.0, 566, 566, 566.0, 566.0, 566.0, 566.0, 1.7667844522968197, 0.37613184628975266, 1.204312058303887], "isController": false}, {"data": ["仿真承兑统一签收", 1, 0, 0.0, 573.0, 573, 573, 573.0, 573.0, 573.0, 573.0, 1.7452006980802792, 0.371536867364747, 1.189599694589878], "isController": false}, {"data": ["调试取样器", 1, 0, 0.0, 8.0, 8, 8, 8.0, 8.0, 8.0, 8.0, 125.0, 626.3427734375, 0.0], "isController": false}, {"data": ["仿真提示收票统一申请查询", 1, 0, 0.0, 327.0, 327, 327, 327.0, 327.0, 327.0, 327.0, 3.058103975535168, 17.91260512232416, 2.893850344036697], "isController": false}, {"data": ["仿真贴现统一申请", 1, 0, 0.0, 860.0, 860, 860, 860.0, 860.0, 860.0, 860.0, 1.1627906976744187, 0.22256540697674418, 1.8759084302325582], "isController": false}, {"data": ["仿真贴现统一申请查询", 1, 0, 0.0, 461.0, 461, 461, 461.0, 461.0, 461.0, 461.0, 2.1691973969631237, 12.616933297180044, 2.086581480477223], "isController": false}, {"data": ["仿真承兑统一签收查询", 1, 0, 0.0, 273.0, 273, 273, 273.0, 273.0, 273.0, 273.0, 3.663003663003663, 20.886990613553113, 3.2087053571428568], "isController": false}, {"data": ["bemp登录-SM4加密模式", 1, 0, 0.0, 655.0, 655, 655, 655.0, 655.0, 655.0, 655.0, 1.5267175572519083, 16.86694895038168, 3.41424141221374], "isController": false}, {"data": ["仿真解质押统一签收", 1, 0, 0.0, 848.0, 848, 848, 848.0, 848.0, 848.0, 848.0, 1.1792452830188678, 0.2510502653301887, 0.8038214917452831], "isController": false}, {"data": ["bemp资产分类设置", 1, 0, 0.0, 348.0, 348, 348, 348.0, 348.0, 348.0, 348.0, 2.8735632183908044, 2.4863056752873565, 5.320581896551724], "isController": false}, {"data": ["仿真贴现统一签收", 1, 0, 0.0, 975.0, 975, 975, 975.0, 975.0, 975.0, 975.0, 1.0256410256410255, 0.19631410256410256, 0.7301682692307693], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Test failed: text expected to contain /&quot;retCode&quot;:&quot;000000&quot;/", 1, 100.0, 2.380952380952381], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 42, 1, "Test failed: text expected to contain /&quot;retCode&quot;:&quot;000000&quot;/", 1, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["bemp提交申请", 1, 1, "Test failed: text expected to contain /&quot;retCode&quot;:&quot;000000&quot;/", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
