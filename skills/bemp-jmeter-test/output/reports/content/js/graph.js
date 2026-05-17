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
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
});


var responseTimePercentilesInfos = {
        data: {"result": {"minY": 54.0, "minX": 0.0, "maxY": 7318.0, "series": [{"data": [[0.0, 54.0], [0.1, 55.0], [0.2, 57.0], [0.3, 58.0], [0.4, 61.0], [0.5, 61.0], [0.6, 62.0], [0.7, 62.0], [0.8, 63.0], [0.9, 63.0], [1.0, 63.0], [1.1, 64.0], [1.2, 64.0], [1.3, 64.0], [1.4, 64.0], [1.5, 64.0], [1.6, 64.0], [1.7, 65.0], [1.8, 66.0], [1.9, 66.0], [2.0, 66.0], [2.1, 66.0], [2.2, 66.0], [2.3, 67.0], [2.4, 68.0], [2.5, 69.0], [2.6, 69.0], [2.7, 69.0], [2.8, 69.0], [2.9, 69.0], [3.0, 70.0], [3.1, 70.0], [3.2, 70.0], [3.3, 71.0], [3.4, 71.0], [3.5, 71.0], [3.6, 74.0], [3.7, 76.0], [3.8, 76.0], [3.9, 76.0], [4.0, 77.0], [4.1, 77.0], [4.2, 78.0], [4.3, 78.0], [4.4, 78.0], [4.5, 78.0], [4.6, 79.0], [4.7, 79.0], [4.8, 80.0], [4.9, 81.0], [5.0, 81.0], [5.1, 81.0], [5.2, 81.0], [5.3, 81.0], [5.4, 81.0], [5.5, 81.0], [5.6, 81.0], [5.7, 82.0], [5.8, 82.0], [5.9, 82.0], [6.0, 82.0], [6.1, 82.0], [6.2, 82.0], [6.3, 82.0], [6.4, 83.0], [6.5, 83.0], [6.6, 83.0], [6.7, 83.0], [6.8, 83.0], [6.9, 83.0], [7.0, 83.0], [7.1, 83.0], [7.2, 84.0], [7.3, 84.0], [7.4, 85.0], [7.5, 86.0], [7.6, 86.0], [7.7, 86.0], [7.8, 86.0], [7.9, 86.0], [8.0, 86.0], [8.1, 86.0], [8.2, 87.0], [8.3, 87.0], [8.4, 87.0], [8.5, 87.0], [8.6, 87.0], [8.7, 87.0], [8.8, 87.0], [8.9, 87.0], [9.0, 87.0], [9.1, 87.0], [9.2, 87.0], [9.3, 87.0], [9.4, 87.0], [9.5, 87.0], [9.6, 87.0], [9.7, 87.0], [9.8, 87.0], [9.9, 88.0], [10.0, 88.0], [10.1, 88.0], [10.2, 88.0], [10.3, 89.0], [10.4, 89.0], [10.5, 89.0], [10.6, 89.0], [10.7, 89.0], [10.8, 89.0], [10.9, 89.0], [11.0, 89.0], [11.1, 90.0], [11.2, 90.0], [11.3, 90.0], [11.4, 90.0], [11.5, 90.0], [11.6, 90.0], [11.7, 90.0], [11.8, 90.0], [11.9, 91.0], [12.0, 91.0], [12.1, 91.0], [12.2, 91.0], [12.3, 92.0], [12.4, 92.0], [12.5, 92.0], [12.6, 92.0], [12.7, 92.0], [12.8, 92.0], [12.9, 92.0], [13.0, 92.0], [13.1, 92.0], [13.2, 92.0], [13.3, 92.0], [13.4, 92.0], [13.5, 93.0], [13.6, 93.0], [13.7, 93.0], [13.8, 93.0], [13.9, 93.0], [14.0, 93.0], [14.1, 93.0], [14.2, 93.0], [14.3, 93.0], [14.4, 93.0], [14.5, 93.0], [14.6, 93.0], [14.7, 94.0], [14.8, 94.0], [14.9, 94.0], [15.0, 94.0], [15.1, 94.0], [15.2, 94.0], [15.3, 94.0], [15.4, 94.0], [15.5, 94.0], [15.6, 95.0], [15.7, 95.0], [15.8, 95.0], [15.9, 95.0], [16.0, 95.0], [16.1, 95.0], [16.2, 95.0], [16.3, 95.0], [16.4, 95.0], [16.5, 95.0], [16.6, 95.0], [16.7, 95.0], [16.8, 95.0], [16.9, 95.0], [17.0, 96.0], [17.1, 96.0], [17.2, 96.0], [17.3, 96.0], [17.4, 96.0], [17.5, 96.0], [17.6, 96.0], [17.7, 96.0], [17.8, 96.0], [17.9, 97.0], [18.0, 97.0], [18.1, 97.0], [18.2, 97.0], [18.3, 97.0], [18.4, 97.0], [18.5, 98.0], [18.6, 98.0], [18.7, 98.0], [18.8, 98.0], [18.9, 99.0], [19.0, 99.0], [19.1, 100.0], [19.2, 100.0], [19.3, 100.0], [19.4, 100.0], [19.5, 100.0], [19.6, 100.0], [19.7, 101.0], [19.8, 101.0], [19.9, 101.0], [20.0, 101.0], [20.1, 101.0], [20.2, 101.0], [20.3, 101.0], [20.4, 101.0], [20.5, 101.0], [20.6, 101.0], [20.7, 102.0], [20.8, 102.0], [20.9, 102.0], [21.0, 102.0], [21.1, 102.0], [21.2, 102.0], [21.3, 102.0], [21.4, 102.0], [21.5, 102.0], [21.6, 102.0], [21.7, 102.0], [21.8, 103.0], [21.9, 103.0], [22.0, 103.0], [22.1, 103.0], [22.2, 103.0], [22.3, 103.0], [22.4, 104.0], [22.5, 104.0], [22.6, 104.0], [22.7, 104.0], [22.8, 104.0], [22.9, 104.0], [23.0, 104.0], [23.1, 104.0], [23.2, 104.0], [23.3, 104.0], [23.4, 104.0], [23.5, 104.0], [23.6, 104.0], [23.7, 104.0], [23.8, 104.0], [23.9, 104.0], [24.0, 104.0], [24.1, 105.0], [24.2, 105.0], [24.3, 105.0], [24.4, 105.0], [24.5, 105.0], [24.6, 105.0], [24.7, 105.0], [24.8, 105.0], [24.9, 105.0], [25.0, 105.0], [25.1, 105.0], [25.2, 105.0], [25.3, 105.0], [25.4, 105.0], [25.5, 105.0], [25.6, 106.0], [25.7, 106.0], [25.8, 106.0], [25.9, 106.0], [26.0, 106.0], [26.1, 106.0], [26.2, 106.0], [26.3, 106.0], [26.4, 106.0], [26.5, 106.0], [26.6, 106.0], [26.7, 106.0], [26.8, 106.0], [26.9, 106.0], [27.0, 106.0], [27.1, 107.0], [27.2, 107.0], [27.3, 107.0], [27.4, 107.0], [27.5, 107.0], [27.6, 107.0], [27.7, 108.0], [27.8, 108.0], [27.9, 109.0], [28.0, 109.0], [28.1, 109.0], [28.2, 109.0], [28.3, 109.0], [28.4, 109.0], [28.5, 110.0], [28.6, 110.0], [28.7, 110.0], [28.8, 110.0], [28.9, 110.0], [29.0, 110.0], [29.1, 111.0], [29.2, 111.0], [29.3, 111.0], [29.4, 111.0], [29.5, 111.0], [29.6, 111.0], [29.7, 111.0], [29.8, 112.0], [29.9, 112.0], [30.0, 112.0], [30.1, 112.0], [30.2, 112.0], [30.3, 112.0], [30.4, 112.0], [30.5, 112.0], [30.6, 112.0], [30.7, 112.0], [30.8, 112.0], [30.9, 112.0], [31.0, 113.0], [31.1, 113.0], [31.2, 113.0], [31.3, 113.0], [31.4, 113.0], [31.5, 113.0], [31.6, 113.0], [31.7, 113.0], [31.8, 113.0], [31.9, 113.0], [32.0, 113.0], [32.1, 113.0], [32.2, 113.0], [32.3, 113.0], [32.4, 113.0], [32.5, 113.0], [32.6, 113.0], [32.7, 113.0], [32.8, 113.0], [32.9, 114.0], [33.0, 114.0], [33.1, 114.0], [33.2, 114.0], [33.3, 114.0], [33.4, 114.0], [33.5, 114.0], [33.6, 114.0], [33.7, 114.0], [33.8, 114.0], [33.9, 114.0], [34.0, 114.0], [34.1, 114.0], [34.2, 114.0], [34.3, 114.0], [34.4, 114.0], [34.5, 114.0], [34.6, 114.0], [34.7, 114.0], [34.8, 114.0], [34.9, 115.0], [35.0, 115.0], [35.1, 115.0], [35.2, 115.0], [35.3, 115.0], [35.4, 115.0], [35.5, 115.0], [35.6, 115.0], [35.7, 116.0], [35.8, 116.0], [35.9, 116.0], [36.0, 116.0], [36.1, 116.0], [36.2, 117.0], [36.3, 117.0], [36.4, 117.0], [36.5, 117.0], [36.6, 117.0], [36.7, 117.0], [36.8, 118.0], [36.9, 118.0], [37.0, 118.0], [37.1, 118.0], [37.2, 119.0], [37.3, 119.0], [37.4, 119.0], [37.5, 119.0], [37.6, 119.0], [37.7, 119.0], [37.8, 119.0], [37.9, 120.0], [38.0, 120.0], [38.1, 120.0], [38.2, 120.0], [38.3, 120.0], [38.4, 120.0], [38.5, 121.0], [38.6, 121.0], [38.7, 121.0], [38.8, 121.0], [38.9, 121.0], [39.0, 121.0], [39.1, 121.0], [39.2, 121.0], [39.3, 121.0], [39.4, 121.0], [39.5, 121.0], [39.6, 121.0], [39.7, 121.0], [39.8, 121.0], [39.9, 121.0], [40.0, 121.0], [40.1, 121.0], [40.2, 121.0], [40.3, 122.0], [40.4, 122.0], [40.5, 122.0], [40.6, 122.0], [40.7, 122.0], [40.8, 122.0], [40.9, 122.0], [41.0, 122.0], [41.1, 122.0], [41.2, 122.0], [41.3, 122.0], [41.4, 122.0], [41.5, 122.0], [41.6, 122.0], [41.7, 122.0], [41.8, 122.0], [41.9, 123.0], [42.0, 123.0], [42.1, 123.0], [42.2, 123.0], [42.3, 123.0], [42.4, 123.0], [42.5, 123.0], [42.6, 123.0], [42.7, 123.0], [42.8, 123.0], [42.9, 123.0], [43.0, 123.0], [43.1, 123.0], [43.2, 123.0], [43.3, 124.0], [43.4, 124.0], [43.5, 124.0], [43.6, 124.0], [43.7, 124.0], [43.8, 125.0], [43.9, 126.0], [44.0, 127.0], [44.1, 128.0], [44.2, 129.0], [44.3, 129.0], [44.4, 130.0], [44.5, 131.0], [44.6, 131.0], [44.7, 131.0], [44.8, 132.0], [44.9, 132.0], [45.0, 132.0], [45.1, 132.0], [45.2, 132.0], [45.3, 133.0], [45.4, 133.0], [45.5, 133.0], [45.6, 133.0], [45.7, 133.0], [45.8, 134.0], [45.9, 134.0], [46.0, 136.0], [46.1, 136.0], [46.2, 136.0], [46.3, 136.0], [46.4, 136.0], [46.5, 136.0], [46.6, 136.0], [46.7, 137.0], [46.8, 137.0], [46.9, 137.0], [47.0, 137.0], [47.1, 137.0], [47.2, 137.0], [47.3, 137.0], [47.4, 137.0], [47.5, 137.0], [47.6, 137.0], [47.7, 138.0], [47.8, 138.0], [47.9, 138.0], [48.0, 138.0], [48.1, 138.0], [48.2, 138.0], [48.3, 138.0], [48.4, 138.0], [48.5, 138.0], [48.6, 138.0], [48.7, 138.0], [48.8, 139.0], [48.9, 142.0], [49.0, 142.0], [49.1, 142.0], [49.2, 143.0], [49.3, 144.0], [49.4, 144.0], [49.5, 144.0], [49.6, 144.0], [49.7, 144.0], [49.8, 145.0], [49.9, 145.0], [50.0, 145.0], [50.1, 145.0], [50.2, 145.0], [50.3, 145.0], [50.4, 145.0], [50.5, 146.0], [50.6, 146.0], [50.7, 146.0], [50.8, 146.0], [50.9, 147.0], [51.0, 147.0], [51.1, 147.0], [51.2, 148.0], [51.3, 148.0], [51.4, 148.0], [51.5, 149.0], [51.6, 149.0], [51.7, 150.0], [51.8, 150.0], [51.9, 150.0], [52.0, 150.0], [52.1, 150.0], [52.2, 150.0], [52.3, 150.0], [52.4, 151.0], [52.5, 151.0], [52.6, 151.0], [52.7, 151.0], [52.8, 151.0], [52.9, 151.0], [53.0, 151.0], [53.1, 151.0], [53.2, 151.0], [53.3, 152.0], [53.4, 152.0], [53.5, 152.0], [53.6, 152.0], [53.7, 152.0], [53.8, 152.0], [53.9, 152.0], [54.0, 152.0], [54.1, 153.0], [54.2, 153.0], [54.3, 153.0], [54.4, 153.0], [54.5, 153.0], [54.6, 153.0], [54.7, 153.0], [54.8, 153.0], [54.9, 154.0], [55.0, 154.0], [55.1, 154.0], [55.2, 154.0], [55.3, 158.0], [55.4, 158.0], [55.5, 159.0], [55.6, 159.0], [55.7, 159.0], [55.8, 159.0], [55.9, 160.0], [56.0, 160.0], [56.1, 160.0], [56.2, 160.0], [56.3, 160.0], [56.4, 160.0], [56.5, 160.0], [56.6, 161.0], [56.7, 161.0], [56.8, 161.0], [56.9, 161.0], [57.0, 161.0], [57.1, 161.0], [57.2, 161.0], [57.3, 161.0], [57.4, 161.0], [57.5, 161.0], [57.6, 161.0], [57.7, 161.0], [57.8, 161.0], [57.9, 161.0], [58.0, 162.0], [58.1, 162.0], [58.2, 162.0], [58.3, 162.0], [58.4, 162.0], [58.5, 162.0], [58.6, 163.0], [58.7, 163.0], [58.8, 164.0], [58.9, 164.0], [59.0, 164.0], [59.1, 164.0], [59.2, 164.0], [59.3, 164.0], [59.4, 164.0], [59.5, 165.0], [59.6, 165.0], [59.7, 165.0], [59.8, 165.0], [59.9, 165.0], [60.0, 165.0], [60.1, 165.0], [60.2, 166.0], [60.3, 166.0], [60.4, 166.0], [60.5, 166.0], [60.6, 166.0], [60.7, 166.0], [60.8, 166.0], [60.9, 166.0], [61.0, 166.0], [61.1, 166.0], [61.2, 166.0], [61.3, 166.0], [61.4, 167.0], [61.5, 167.0], [61.6, 168.0], [61.7, 168.0], [61.8, 168.0], [61.9, 168.0], [62.0, 169.0], [62.1, 169.0], [62.2, 169.0], [62.3, 169.0], [62.4, 169.0], [62.5, 170.0], [62.6, 170.0], [62.7, 170.0], [62.8, 170.0], [62.9, 173.0], [63.0, 173.0], [63.1, 173.0], [63.2, 175.0], [63.3, 175.0], [63.4, 175.0], [63.5, 176.0], [63.6, 176.0], [63.7, 176.0], [63.8, 176.0], [63.9, 176.0], [64.0, 176.0], [64.1, 176.0], [64.2, 177.0], [64.3, 177.0], [64.4, 177.0], [64.5, 179.0], [64.6, 181.0], [64.7, 181.0], [64.8, 181.0], [64.9, 182.0], [65.0, 182.0], [65.1, 182.0], [65.2, 182.0], [65.3, 182.0], [65.4, 182.0], [65.5, 182.0], [65.6, 183.0], [65.7, 183.0], [65.8, 183.0], [65.9, 183.0], [66.0, 183.0], [66.1, 183.0], [66.2, 183.0], [66.3, 183.0], [66.4, 183.0], [66.5, 183.0], [66.6, 184.0], [66.7, 184.0], [66.8, 184.0], [66.9, 184.0], [67.0, 184.0], [67.1, 184.0], [67.2, 185.0], [67.3, 185.0], [67.4, 189.0], [67.5, 190.0], [67.6, 190.0], [67.7, 195.0], [67.8, 196.0], [67.9, 196.0], [68.0, 196.0], [68.1, 197.0], [68.2, 197.0], [68.3, 197.0], [68.4, 198.0], [68.5, 198.0], [68.6, 199.0], [68.7, 200.0], [68.8, 201.0], [68.9, 201.0], [69.0, 201.0], [69.1, 201.0], [69.2, 202.0], [69.3, 202.0], [69.4, 203.0], [69.5, 203.0], [69.6, 204.0], [69.7, 205.0], [69.8, 205.0], [69.9, 205.0], [70.0, 205.0], [70.1, 205.0], [70.2, 205.0], [70.3, 205.0], [70.4, 205.0], [70.5, 205.0], [70.6, 206.0], [70.7, 206.0], [70.8, 206.0], [70.9, 206.0], [71.0, 206.0], [71.1, 206.0], [71.2, 206.0], [71.3, 206.0], [71.4, 207.0], [71.5, 208.0], [71.6, 214.0], [71.7, 214.0], [71.8, 216.0], [71.9, 218.0], [72.0, 218.0], [72.1, 219.0], [72.2, 219.0], [72.3, 219.0], [72.4, 219.0], [72.5, 219.0], [72.6, 220.0], [72.7, 220.0], [72.8, 220.0], [72.9, 220.0], [73.0, 220.0], [73.1, 220.0], [73.2, 221.0], [73.3, 221.0], [73.4, 222.0], [73.5, 223.0], [73.6, 223.0], [73.7, 224.0], [73.8, 224.0], [73.9, 224.0], [74.0, 224.0], [74.1, 224.0], [74.2, 224.0], [74.3, 227.0], [74.4, 227.0], [74.5, 228.0], [74.6, 228.0], [74.7, 229.0], [74.8, 229.0], [74.9, 229.0], [75.0, 229.0], [75.1, 230.0], [75.2, 230.0], [75.3, 231.0], [75.4, 231.0], [75.5, 231.0], [75.6, 232.0], [75.7, 232.0], [75.8, 232.0], [75.9, 232.0], [76.0, 233.0], [76.1, 235.0], [76.2, 236.0], [76.3, 236.0], [76.4, 243.0], [76.5, 244.0], [76.6, 244.0], [76.7, 244.0], [76.8, 244.0], [76.9, 244.0], [77.0, 244.0], [77.1, 245.0], [77.2, 248.0], [77.3, 248.0], [77.4, 248.0], [77.5, 249.0], [77.6, 249.0], [77.7, 250.0], [77.8, 250.0], [77.9, 250.0], [78.0, 250.0], [78.1, 250.0], [78.2, 254.0], [78.3, 254.0], [78.4, 255.0], [78.5, 255.0], [78.6, 255.0], [78.7, 264.0], [78.8, 264.0], [78.9, 268.0], [79.0, 269.0], [79.1, 269.0], [79.2, 269.0], [79.3, 270.0], [79.4, 271.0], [79.5, 271.0], [79.6, 271.0], [79.7, 271.0], [79.8, 271.0], [79.9, 275.0], [80.0, 275.0], [80.1, 275.0], [80.2, 276.0], [80.3, 276.0], [80.4, 276.0], [80.5, 280.0], [80.6, 282.0], [80.7, 288.0], [80.8, 288.0], [80.9, 289.0], [81.0, 289.0], [81.1, 304.0], [81.2, 304.0], [81.3, 304.0], [81.4, 304.0], [81.5, 305.0], [81.6, 305.0], [81.7, 306.0], [81.8, 306.0], [81.9, 307.0], [82.0, 307.0], [82.1, 307.0], [82.2, 307.0], [82.3, 308.0], [82.4, 314.0], [82.5, 314.0], [82.6, 320.0], [82.7, 320.0], [82.8, 320.0], [82.9, 321.0], [83.0, 321.0], [83.1, 321.0], [83.2, 321.0], [83.3, 322.0], [83.4, 322.0], [83.5, 323.0], [83.6, 324.0], [83.7, 324.0], [83.8, 325.0], [83.9, 325.0], [84.0, 326.0], [84.1, 326.0], [84.2, 326.0], [84.3, 326.0], [84.4, 326.0], [84.5, 326.0], [84.6, 326.0], [84.7, 327.0], [84.8, 327.0], [84.9, 327.0], [85.0, 327.0], [85.1, 327.0], [85.2, 327.0], [85.3, 327.0], [85.4, 327.0], [85.5, 327.0], [85.6, 328.0], [85.7, 328.0], [85.8, 328.0], [85.9, 328.0], [86.0, 329.0], [86.1, 329.0], [86.2, 329.0], [86.3, 330.0], [86.4, 330.0], [86.5, 332.0], [86.6, 333.0], [86.7, 333.0], [86.8, 334.0], [86.9, 334.0], [87.0, 334.0], [87.1, 335.0], [87.2, 335.0], [87.3, 339.0], [87.4, 339.0], [87.5, 340.0], [87.6, 340.0], [87.7, 340.0], [87.8, 340.0], [87.9, 340.0], [88.0, 340.0], [88.1, 340.0], [88.2, 340.0], [88.3, 341.0], [88.4, 341.0], [88.5, 342.0], [88.6, 342.0], [88.7, 350.0], [88.8, 350.0], [88.9, 351.0], [89.0, 355.0], [89.1, 355.0], [89.2, 357.0], [89.3, 358.0], [89.4, 358.0], [89.5, 358.0], [89.6, 358.0], [89.7, 359.0], [89.8, 359.0], [89.9, 359.0], [90.0, 360.0], [90.1, 360.0], [90.2, 360.0], [90.3, 360.0], [90.4, 360.0], [90.5, 360.0], [90.6, 360.0], [90.7, 360.0], [90.8, 360.0], [90.9, 360.0], [91.0, 363.0], [91.1, 364.0], [91.2, 364.0], [91.3, 364.0], [91.4, 364.0], [91.5, 364.0], [91.6, 370.0], [91.7, 370.0], [91.8, 370.0], [91.9, 370.0], [92.0, 370.0], [92.1, 370.0], [92.2, 376.0], [92.3, 376.0], [92.4, 377.0], [92.5, 391.0], [92.6, 392.0], [92.7, 394.0], [92.8, 395.0], [92.9, 396.0], [93.0, 396.0], [93.1, 423.0], [93.2, 423.0], [93.3, 423.0], [93.4, 423.0], [93.5, 424.0], [93.6, 424.0], [93.7, 425.0], [93.8, 426.0], [93.9, 428.0], [94.0, 429.0], [94.1, 429.0], [94.2, 430.0], [94.3, 430.0], [94.4, 431.0], [94.5, 431.0], [94.6, 432.0], [94.7, 432.0], [94.8, 443.0], [94.9, 472.0], [95.0, 472.0], [95.1, 530.0], [95.2, 530.0], [95.3, 547.0], [95.4, 548.0], [95.5, 548.0], [95.6, 548.0], [95.7, 548.0], [95.8, 548.0], [95.9, 548.0], [96.0, 549.0], [96.1, 550.0], [96.2, 612.0], [96.3, 612.0], [96.4, 614.0], [96.5, 614.0], [96.6, 615.0], [96.7, 615.0], [96.8, 616.0], [96.9, 616.0], [97.0, 616.0], [97.1, 617.0], [97.2, 617.0], [97.3, 628.0], [97.4, 632.0], [97.5, 736.0], [97.6, 796.0], [97.7, 817.0], [97.8, 818.0], [97.9, 818.0], [98.0, 818.0], [98.1, 966.0], [98.2, 966.0], [98.3, 1225.0], [98.4, 1225.0], [98.5, 1225.0], [98.6, 2379.0], [98.7, 2986.0], [98.8, 3482.0], [98.9, 3731.0], [99.0, 3978.0], [99.1, 4598.0], [99.2, 4732.0], [99.3, 5213.0], [99.4, 5476.0], [99.5, 5733.0], [99.6, 6227.0], [99.7, 6485.0], [99.8, 6978.0], [99.9, 7223.0]], "isOverall": false, "label": "访问百度首页", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

/**
 * @param elementId Id of element where we display message
 */
function setEmptyGraph(elementId) {
    $(function() {
        $(elementId).text("No graph series with filter="+seriesFilter);
    });
}

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimePercentiles");
        return;
    }
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 0.0, "maxY": 698.0, "series": [{"data": [[0.0, 268.0], [600.0, 18.0], [700.0, 3.0], [800.0, 5.0], [900.0, 3.0], [1100.0, 1.0], [1200.0, 4.0], [100.0, 698.0], [2300.0, 1.0], [2900.0, 1.0], [3300.0, 1.0], [200.0, 174.0], [3400.0, 1.0], [3700.0, 1.0], [3900.0, 1.0], [4200.0, 1.0], [4500.0, 1.0], [4700.0, 1.0], [300.0, 169.0], [4900.0, 1.0], [5200.0, 1.0], [5400.0, 1.0], [5700.0, 1.0], [6000.0, 1.0], [6200.0, 1.0], [6400.0, 1.0], [400.0, 28.0], [6900.0, 1.0], [6800.0, 1.0], [7200.0, 1.0], [7300.0, 1.0], [500.0, 16.0]], "isOverall": false, "label": "访问百度首页", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 7300.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeDistribution");
        return;
    }
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 20.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 1337.0, "series": [{"data": [[0.0, 1337.0]], "color": "#9ACD32", "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[1.0, 50.0]], "color": "yellow", "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[2.0, 20.0]], "color": "orange", "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}, {"data": [], "color": "#FF6347", "isOverall": false, "label": "Requests in error", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 2.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 9.875, "minX": 1.77675804E12, "maxY": 20.0, "series": [{"data": [[1.776758053E12, 20.0], [1.776758051E12, 20.0], [1.776758052E12, 20.0], [1.77675805E12, 20.0], [1.776758049E12, 20.0], [1.776758054E12, 9.875], [1.776758042E12, 20.0], [1.776758041E12, 20.0], [1.77675804E12, 20.0], [1.776758047E12, 20.0], [1.776758048E12, 20.0], [1.776758046E12, 20.0], [1.776758045E12, 20.0], [1.776758043E12, 20.0], [1.776758044E12, 20.0]], "isOverall": false, "label": "百度压测线程组", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 1.776758054E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 251.1869158878509, "minX": 4.0, "maxY": 1225.25, "series": [{"data": [[16.0, 756.0], [8.0, 966.0], [4.0, 1225.25], [20.0, 251.1869158878509], [5.0, 1172.0], [13.0, 817.6]], "isOverall": false, "label": "访问百度首页", "isController": false}, {"data": [[19.88486140724947, 259.22388059701524]], "isOverall": false, "label": "访问百度首页-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 20.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTimeVsThreads");
        return;
    }
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 118.0, "minX": 1.77675804E12, "maxY": 446080.0, "series": [{"data": [[1.776758053E12, 174080.0], [1.776758051E12, 326400.0], [1.776758052E12, 348160.0], [1.77675805E12, 255680.0], [1.776758049E12, 326400.0], [1.776758054E12, 43520.0], [1.776758042E12, 179520.0], [1.776758041E12, 288320.0], [1.77675804E12, 2720.0], [1.776758047E12, 446080.0], [1.776758048E12, 340000.0], [1.776758046E12, 301920.0], [1.776758045E12, 326400.0], [1.776758043E12, 204000.0], [1.776758044E12, 263840.0]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.776758053E12, 7552.0], [1.776758051E12, 14160.0], [1.776758052E12, 15104.0], [1.77675805E12, 11092.0], [1.776758049E12, 14160.0], [1.776758054E12, 1888.0], [1.776758042E12, 7788.0], [1.776758041E12, 12508.0], [1.77675804E12, 118.0], [1.776758047E12, 19352.0], [1.776758048E12, 14750.0], [1.776758046E12, 13098.0], [1.776758045E12, 14160.0], [1.776758043E12, 8850.0], [1.776758044E12, 11446.0]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 1.776758054E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 127.4864864864865, "minX": 1.77675804E12, "maxY": 2379.0, "series": [{"data": [[1.776758053E12, 163.98437499999991], [1.776758051E12, 184.61666666666667], [1.776758052E12, 157.28124999999997], [1.77675805E12, 197.8404255319149], [1.776758049E12, 155.66666666666669], [1.776758054E12, 957.9375], [1.776758042E12, 355.71212121212113], [1.776758041E12, 1039.7075471698113], [1.77675804E12, 2379.0], [1.776758047E12, 158.93902439024401], [1.776758048E12, 163.62399999999997], [1.776758046E12, 127.4864864864865], [1.776758045E12, 183.00000000000009], [1.776758043E12, 283.7733333333333], [1.776758044E12, 199.63917525773192]], "isOverall": false, "label": "访问百度首页", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 1000, "maxX": 1.776758054E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 126.87387387387385, "minX": 1.77675804E12, "maxY": 2370.0, "series": [{"data": [[1.776758053E12, 162.35937500000006], [1.776758051E12, 182.95000000000005], [1.776758052E12, 156.25000000000006], [1.77675805E12, 192.54255319148933], [1.776758049E12, 154.55], [1.776758054E12, 952.0625], [1.776758042E12, 353.4999999999999], [1.776758041E12, 1037.3867924528306], [1.77675804E12, 2370.0], [1.776758047E12, 156.07926829268283], [1.776758048E12, 162.10400000000004], [1.776758046E12, 126.87387387387385], [1.776758045E12, 182.52500000000003], [1.776758043E12, 277.22666666666663], [1.776758044E12, 195.92783505154642]], "isOverall": false, "label": "访问百度首页", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 1000, "maxX": 1.776758054E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyLatenciesOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.77675804E12, "maxY": 2298.0, "series": [{"data": [[1.776758053E12, 0.0], [1.776758051E12, 0.0], [1.776758052E12, 0.0], [1.77675805E12, 0.0], [1.776758049E12, 0.0], [1.776758054E12, 0.0], [1.776758042E12, 0.0], [1.776758041E12, 872.9245283018861], [1.77675804E12, 2298.0], [1.776758047E12, 0.0], [1.776758048E12, 0.0], [1.776758046E12, 0.0], [1.776758045E12, 0.0], [1.776758043E12, 0.0], [1.776758044E12, 0.0]], "isOverall": false, "label": "访问百度首页", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 1000, "maxX": 1.776758054E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyConnectTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 54.0, "minX": 1.77675804E12, "maxY": 7318.0, "series": [{"data": [[1.776758053E12, 364.0], [1.776758051E12, 371.0], [1.776758052E12, 335.0], [1.77675805E12, 472.0], [1.776758049E12, 276.0], [1.776758054E12, 1226.0], [1.776758042E12, 632.0], [1.776758041E12, 7318.0], [1.77675804E12, 2379.0], [1.776758047E12, 550.0], [1.776758048E12, 328.0], [1.776758046E12, 359.0], [1.776758045E12, 377.0], [1.776758043E12, 530.0], [1.776758044E12, 326.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.776758053E12, 184.5], [1.776758051E12, 341.0], [1.776758052E12, 255.0], [1.77675805E12, 423.0], [1.776758049E12, 270.9], [1.776758054E12, 1225.3], [1.776758042E12, 616.3], [1.776758041E12, 5052.699999999999], [1.77675804E12, 2379.0], [1.776758047E12, 364.0], [1.776758048E12, 327.0], [1.776758046E12, 204.0], [1.776758045E12, 360.0], [1.776758043E12, 395.4], [1.776758044E12, 320.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.776758053E12, 364.0], [1.776758051E12, 370.78999999999996], [1.776758052E12, 335.0], [1.77675805E12, 472.0], [1.776758049E12, 276.0], [1.776758054E12, 1226.0], [1.776758042E12, 632.0], [1.776758041E12, 7311.349999999999], [1.77675804E12, 2379.0], [1.776758047E12, 549.35], [1.776758048E12, 328.0], [1.776758046E12, 358.88], [1.776758045E12, 373.42999999999984], [1.776758043E12, 530.0], [1.776758044E12, 326.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.776758053E12, 363.0], [1.776758051E12, 370.0], [1.776758052E12, 333.55], [1.77675805E12, 424.0], [1.776758049E12, 273.84999999999997], [1.776758054E12, 1226.0], [1.776758042E12, 617.65], [1.776758041E12, 6394.699999999998], [1.77675804E12, 2379.0], [1.776758047E12, 548.0], [1.776758048E12, 327.0], [1.776758046E12, 358.0], [1.776758045E12, 360.0], [1.776758043E12, 460.40000000000026], [1.776758044E12, 326.0]], "isOverall": false, "label": "95th percentile", "isController": false}, {"data": [[1.776758053E12, 77.0], [1.776758051E12, 81.0], [1.776758052E12, 71.0], [1.77675805E12, 66.0], [1.776758049E12, 94.0], [1.776758054E12, 736.0], [1.776758042E12, 99.0], [1.776758041E12, 71.0], [1.77675804E12, 2379.0], [1.776758047E12, 54.0], [1.776758048E12, 79.0], [1.776758046E12, 61.0], [1.776758045E12, 103.0], [1.776758043E12, 165.0], [1.776758044E12, 81.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.776758053E12, 165.5], [1.776758051E12, 147.5], [1.776758052E12, 122.5], [1.77675805E12, 152.5], [1.776758049E12, 117.5], [1.776758054E12, 892.0], [1.776758042E12, 394.0], [1.776758041E12, 114.0], [1.77675804E12, 2379.0], [1.776758047E12, 131.0], [1.776758048E12, 124.0], [1.776758046E12, 100.0], [1.776758045E12, 140.5], [1.776758043E12, 321.0], [1.776758044E12, 218.0]], "isOverall": false, "label": "Median", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 1.776758054E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 100.0, "minX": 1.0, "maxY": 2379.0, "series": [{"data": [[128.0, 122.5], [164.0, 131.0], [1.0, 2379.0], [66.0, 394.0], [64.0, 165.5], [16.0, 892.0], [75.0, 321.0], [94.0, 152.5], [97.0, 218.0], [106.0, 114.0], [111.0, 100.0], [120.0, 122.0], [125.0, 124.0]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 164.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 99.0, "minX": 1.0, "maxY": 2370.0, "series": [{"data": [[128.0, 122.0], [164.0, 127.0], [1.0, 2370.0], [66.0, 385.0], [64.0, 151.0], [16.0, 891.5], [75.0, 321.0], [94.0, 152.5], [97.0, 215.0], [106.0, 113.0], [111.0, 99.0], [120.0, 122.0], [125.0, 123.0]], "isOverall": false, "label": "Successes", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 164.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median Latency time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 1.0, "minX": 1.776758033E12, "maxY": 164.0, "series": [{"data": [[1.776758053E12, 60.0], [1.776758051E12, 120.0], [1.776758052E12, 128.0], [1.77675805E12, 94.0], [1.776758049E12, 120.0], [1.776758037E12, 4.0], [1.776758035E12, 4.0], [1.776758036E12, 4.0], [1.776758034E12, 4.0], [1.776758033E12, 2.0], [1.776758042E12, 66.0], [1.776758041E12, 106.0], [1.77675804E12, 1.0], [1.776758038E12, 2.0], [1.776758047E12, 164.0], [1.776758048E12, 125.0], [1.776758046E12, 111.0], [1.776758045E12, 120.0], [1.776758043E12, 75.0], [1.776758044E12, 97.0]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 1.776758053E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 1.0, "minX": 1.77675804E12, "maxY": 164.0, "series": [{"data": [[1.776758053E12, 64.0], [1.776758051E12, 120.0], [1.776758052E12, 128.0], [1.77675805E12, 94.0], [1.776758049E12, 120.0], [1.776758054E12, 16.0], [1.776758042E12, 66.0], [1.776758041E12, 106.0], [1.77675804E12, 1.0], [1.776758047E12, 164.0], [1.776758048E12, 125.0], [1.776758046E12, 111.0], [1.776758045E12, 120.0], [1.776758043E12, 75.0], [1.776758044E12, 97.0]], "isOverall": false, "label": "200", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 1.776758054E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 1.0, "minX": 1.77675804E12, "maxY": 164.0, "series": [{"data": [[1.776758053E12, 64.0], [1.776758051E12, 120.0], [1.776758052E12, 128.0], [1.77675805E12, 94.0], [1.776758049E12, 120.0], [1.776758054E12, 16.0], [1.776758042E12, 66.0], [1.776758041E12, 106.0], [1.77675804E12, 1.0], [1.776758047E12, 164.0], [1.776758048E12, 125.0], [1.776758046E12, 111.0], [1.776758045E12, 120.0], [1.776758043E12, 75.0], [1.776758044E12, 97.0]], "isOverall": false, "label": "访问百度首页-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 1000, "maxX": 1.776758054E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTransactionsPerSecond");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var totalTPSInfos = {
        data: {"result": {"minY": 1.0, "minX": 1.77675804E12, "maxY": 164.0, "series": [{"data": [[1.776758053E12, 64.0], [1.776758051E12, 120.0], [1.776758052E12, 128.0], [1.77675805E12, 94.0], [1.776758049E12, 120.0], [1.776758054E12, 16.0], [1.776758042E12, 66.0], [1.776758041E12, 106.0], [1.77675804E12, 1.0], [1.776758047E12, 164.0], [1.776758048E12, 125.0], [1.776758046E12, 111.0], [1.776758045E12, 120.0], [1.776758043E12, 75.0], [1.776758044E12, 97.0]], "isOverall": false, "label": "Transaction-success", "isController": false}, {"data": [], "isOverall": false, "label": "Transaction-failure", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 1000, "maxX": 1.776758054E12, "title": "Total Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTotalTPS"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                },
                colors: ["#9ACD32", "#FF6347"]
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTotalTPS"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTotalTPS"), dataset, options);
        // setup overview
        $.plot($("#overviewTotalTPS"), dataset, prepareOverviewOptions(options));
    }
};

// Total Transactions per second
function refreshTotalTPS(fixTimestamps) {
    var infos = totalTPSInfos;
    // We want to ignore seriesFilter
    prepareSeries(infos.data, false, true);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 28800000);
    }
    if(isGraph($("#flotTotalTPS"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTotalTPS");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTotalTPS", "#overviewTotalTPS");
        $('#footerTotalTPS .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyCustomGraph") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCustomGraph(true);
            }
            document.location.href="#responseCustomGraph";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyTotalTPS") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTotalTPS(true);
            }
            document.location.href="#totalTPS";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    }else if(id == "choicesResponseCustomGraph"){
        choiceContainer = $("#choicesResponseCustomGraph");
        refreshCustomGraph(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "choicesResponseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesTotalTPS"){
        choiceContainer = $("#choicesTotalTPS");
        refreshTotalTPS(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    if(choiceContainer != null) {
        choiceContainer.find("label").each(function(){
            this.style.color = color;
        });
    }
}

