import * as React from 'react';
import { isEqual, get, includes, escape, unescape } from 'lodash';

import { ErrorStates, ErrorCodes } from '@gooddata/react-components';
//import { ErrorCodes as DataErrorCodes } from '@gooddata/data-layer';
import { colors2Object,numberFormat } from '@gooddata/numberjs';


import { AfmUtils } from '@gooddata/data-layer';

import { ErrorStates, ErrorCodes } from '../../../../constants/errorStates';
import { RuntimeError } from '../../../../errors/RuntimeError';

import * as HttpStatusCodes from 'http-status-codes';

function getJSONFromText(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

import * as Highcharts from 'highcharts';

/** @augments {React.Component<any, any>} */
export class MasterDetailChart extends React.Component {

 componentDidMount() {
        const { dataSource, resultSpec } = this.props;      
              
        this.setState({
           isLoaded: false,
        });

         if (dataSource && (get(dataSource,'afm.measures.length',0)==0))
            {
               this.onError( {
                                name: 'NotFound',
                                response: {
                                    status: HttpStatusCodes.NOT_FOUND,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: "{\"error\": {\"message\":\"Missing measure.\"}}"
                              });   
               return;
            }
            
            if (dataSource && (get(dataSource,'afm.attributes.length',0)==0))
            {
               this.onError( {
                                name: 'InvalidBucketsError',
                                response: {
                                    status: HttpStatusCodes.BAD_REQUEST,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: "{\"error\": {\"message\":\"Missing attribute\"}}"
                              });   
               return;
            }
                      
        if (dataSource && (dataSource.afm.measures.length>0))
        {
          this.initDataLoading(dataSource, resultSpec)
        }
        else
        {
         
          this.setState({
               isLoaded: true
          });
          
          this.props.onLoadingChanged({ isLoading: false });          

        } 
   }

  componentWillReceiveProps(nextProps) {
       
       if (!isEqual(this.props, nextProps)) {
           const { dataSource, resultSpec } = nextProps;


            if (dataSource && (get(dataSource,'afm.measures.length',0)==0))
            {
               this.onError( {
                                name: 'NotFound',
                                response: {
                                    status: HttpStatusCodes.NOT_FOUND,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: "{\"error\": {\"message\":\"Missing measure.\"}}"
                              });   
               return;
            }
            
            if (dataSource && (get(dataSource,'afm.attributes.length',0)==0))
            {
               this.onError( {
                                name: 'InvalidBucketsError',
                                response: {
                                    status: HttpStatusCodes.BAD_REQUEST,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: "{\"error\": {\"message\":\"Attribute is not geo pushpin.\"}}"
                              });   
                              
                return;
            }
           
           if (dataSource && (dataSource.afm.measures.length>0))
           {
             this.initDataLoading(dataSource, resultSpec)
           }
           else
           {
             
             this.setState({
                  isLoaded: true
             });
            this.props.onLoadingChanged({ isLoading: false });
            //this.props.onAfterRender();
 
           }
       }
   }


   initDataLoading(dataSource, resultSpec) {
   
   
       this.props.onLoadingChanged({ isLoading: true });
       dataSource.getData(resultSpec)
           .then(this.setDataResult.bind(this))
           .catch(this.onError.bind(this));
   }


   setDataResult(result) {
     console.log(result);
       this.props.pushData({ result });
       if (result.executionResult) {
           
           this.createChart(result);
       }
   }


   createChart(result) 
   {      
   
      const customEscape = (str) => str && escape(unescape(str));

      function parseValue(value) {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? null : parsedValue; // eslint-disable-line no-restricted-globals
      }
      const ctx = this.detailcontainer;
      const ctx2 = this.container;
      
       if ((result.executionResult==null)||((result.executionResult.data.length === 0)&&(!result.executionResult.headerItems)))
       {
          throw {
            name: 'NO_DATA',
            response: {
                status: HttpStatusCodes.NO_CONTENT,
                json: () => Promise.resolve(null),
                text: () => Promise.resolve(null)
            }
          };
       }
      
      if (result.executionResult && result.executionResult.headerItems.length>1 )
      {
           
           const measures = result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items;  
             
           const formats=measures.map((item) => {
             return item.measureHeaderItem.format;
           } );
           
           var categories=[];
           if (result.executionResult.headerItems[1].length==1)
           {
             categories = result.executionResult.headerItems[1][0].map((item) => {
               return item.attributeHeaderItem.name;
             });
           }
           
           var attributeName=result.executionResponse.dimensions[1].headers[0].attributeHeader.formOf.name;
           
           const rawdata=result.executionResult.data[0].map( (item) => { return parseValue(item); });
           var data=[];
           var axistype='datetime';
           
           if ((rawdata.length>0) && (categories[0].match(/\d\d\/\d\d\/\d\d\d\d/)))
           {
               for (var i=0;i<rawdata.length;i++)
               {
                 var d=categories[i];
                 var yy=parseInt(d.substring(6));
                 var mm=parseInt(d.substring(0,2))-1;
                 var dd=parseInt(d.substring(3,5));
                 data.push([Date.UTC(yy,mm,dd),
                            rawdata[i]]);
               } 
           }
           else
           {
               axistype='category';
               for (var i=0;i<rawdata.length;i++)
               {
                 data.push([categories[i],
                            rawdata[i]]);
               }       
          
           }      
           
                            
           var lastMin=0;
           var lastMax=data.length-1;
           
           if (axistype=='datetime')
           {
             lastMin=data[0][0];
             lastMax=data[data.length - 1][0];
           }
           
           try {
             var master;
             var detail=Highcharts.chart(ctx, {
                chart: { type: 'line', height: 300,zoomType: 'x',panning: true,panKey: 'shift',
                 events: {

                         redraw: function(){
                             var extremesObject=detail.xAxis[0];
                             var min = extremesObject.min;
                             var max = extremesObject.max;
 
                            
 
                             if ((min!=lastMin)||(max!=lastMax))
                             {
                               lastMin=min;
                               lastMax=max;
                                
                               var f=0;
                               var t=data.length;
                               if (axistype=='datetime')
                               {
                                 f=data[0][0];
                                 t=data[data.length - 1][0];
                               }
    
              
                               if (master && master.xAxis && master.xAxis.length>0)
                               {
                               // move the plot bands to reflect the new detail span
                               master.xAxis[0].removePlotBand('mask-before');
                               master.xAxis[0].addPlotBand({
                                   id: 'mask-before',
                                   from: f,
                                   to: min,
                                   color: 'rgba(0, 0, 0, 0.1)'
                               });
    
                               master.xAxis[0].removePlotBand('mask-after');
                               master.xAxis[0].addPlotBand({
                                   id: 'mask-after',
                                   from: max,
                                   to: t,
                                   color: 'rgba(0, 0, 0, 0.1)'
                               });
                               
                               master.xAxis[0].removePlotBand('mask-sel');
                               master.xAxis[0].addPlotBand({
                                   id: 'mask-sel',
                                   from: min,
                                   to: max,
                                   color: 'rgba(0, 0, 0, 0.3)'
                               });
                              }
                                                            
                    
                               
                             }
                         
                             return false;                            
                         },
                        // listen to the selection event on the master chart to update the
                        // extremes of the detail chart
                        selection: function (event) {
                            var extremesObject = event.xAxis[0],
                                min = extremesObject.min,
                                max = extremesObject.max,
                                detailData = [],
                                xAxis = this.xAxis[0];

                           
                            
                            var f=0;
                            var t=data.length;
                            if (axistype=='datetime')
                            {
                             f=data[0][0];
                             t=data[data.length - 1][0];
                            }


                            // move the plot bands to reflect the new detail span
                            master.xAxis[0].removePlotBand('mask-before');
                            master.xAxis[0].addPlotBand({
                                id: 'mask-before',
                                from: f,
                                to: min,
                                color: 'rgba(0, 0, 0, 0.1)'
                            });

                            master.xAxis[0].removePlotBand('mask-after');
                            master.xAxis[0].addPlotBand({
                                id: 'mask-after',
                                from: max,
                                to: t,
                                color: 'rgba(0, 0, 0, 0.1)'
                            });
                            
                            master.xAxis[0].removePlotBand('mask-sel');
                            master.xAxis[0].addPlotBand({
                                id: 'mask-sel',
                                from: min,
                                to: max,
                                color: 'rgba(0, 0, 0, 0.3)'
                            });
                            
                            
                            detail.xAxis[0].setExtremes(min, max);
                        
                            return false;
                        }
                      }
                },
                title:{
                  text: null
                },
                yAxis: {
                  title: { text: measures[0].measureHeaderItem.name}
                },
                legend: {enabled: false},
                series: [{
                    color: 'rgb(20,178,226)',
                    name: measures[0].measureHeaderItem.name,
                    data: data
                }],
                xAxis: {                
                  type: axistype,
                  labels: {autoRotation: [0,-90]  },
                  dateTimeLabelFormats: {                      
                        day: '%b %e',
                        week: '%b %e',
                        month: '%b/%\Y',
                        year: '%Y'
                    }  
                },
                credits: { enabled: false },
                tooltip: {borderWidth: 0, borderRadius: 0, shadow: false, backgroundColor: undefined, followPointer: true, useHTML: true,
                          formatter: function() {
                          
                          var point=this.point;
                          var period=point.name;
                          if (axistype=='datetime') period=Highcharts.dateFormat('%B %e %Y', this.x);                          
                          const val=colors2Object(numberFormat(point.y,formats[0])).label;      
                                       
                          const val=customEscape(colors2Object(numberFormat(point.y,point.series.userOptions.format)).label);
                      return  '<div class="hc-tooltip gd-viz-tooltip"> <span class="stroke gd-viz-tooltip-stroke" style="border-top-color: '+point.series.color+'" ></span> <div class="content gd-viz-tooltip-content">'+
                      '<table class="tt-values gd-viz-tooltip-table"><tr class=\"gd-viz-tooltip-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+point.series.name+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+val+'</td></tr>'+
                      '<tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+attributeName+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+period+'</td></tr></table></div><div class="gd-viz-tooltip-tail tail1 gd-viz-tooltip-tail1 center"></div><div class="gd-viz-tooltip-tail tail2 gd-viz-tooltip-tail2 center"></div></div>';
                      }
                }
            
            });
            
            var f=0;
            var t=data.length;
            if (axistype=='datetime')
            {
             f=data[0][0];
             t=data[data.length - 1][0];
            }
            
              var master=Highcharts.chart(ctx2, {
                chart: { type: 'area',
                         height: 150,
                         reflow: false,
                         borderWidth: 0,
                         backgroundColor: null,
                         marginLeft: 50,
                         marginRight: 20,
                         zoomType: 'x',
                         
                         events: {
                            
                         click: function(event)
                         {
                            var xAxis = this.xAxis[0];
                            detail.xAxis[0].setExtremes();
                            xAxis.removePlotBand('mask-before');
                            xAxis.removePlotBand('mask-after');
                            xAxis.removePlotBand('mask-sel');
                          
                            var f=0;
                            var t=data.length;
                            if (axistype=='datetime')
                            {
                             f=data[0][0];
                             t=data[data.length - 1][0];
                            }
                            xAxis.addPlotBand(  
                            {
                                    id: 'mask-before',
                                    from: f,
                                    to: t,
                                    color: 'rgba(0, 0, 0, 0.1)'
                            });
                            
                            
                         },   

                        // listen to the selection event on the master chart to update the
                        // extremes of the detail chart
                        selection: function (event) {
                            var extremesObject = event.xAxis[0],
                                min = extremesObject.min,
                                max = extremesObject.max,
                                detailData = [],
                                xAxis = this.xAxis[0];

                           
                            
                            var f=0;
                            var t=data.length;
                            if (axistype=='datetime')
                            {
                             f=data[0][0];
                             t=data[data.length - 1][0];
                            }


                            // move the plot bands to reflect the new detail span
                            xAxis.removePlotBand('mask-before');
                            xAxis.addPlotBand({
                                id: 'mask-before',
                                from: f,
                                to: min,
                                color: 'rgba(0, 0, 0, 0.1)'
                            });

                            xAxis.removePlotBand('mask-after');
                            xAxis.addPlotBand({
                                id: 'mask-after',
                                from: max,
                                to: t,
                                color: 'rgba(0, 0, 0, 0.1)'
                            });
                            
                            xAxis.removePlotBand('mask-sel');
                            xAxis.addPlotBand({
                                id: 'mask-sel',
                                from: min,
                                to: max,
                                color: 'rgba(0, 0, 0, 0.3)'
                            });
                            
                            
                            detail.xAxis[0].setExtremes(min, max);


                            //detailChart.series[0].setData(detailData);

                            return false;
                        }
                    }
                         
                         },
                title:{
                  text: null
                },
                yAxis: {
                  enabled: false,
                  labels: {
                        enabled: false
                  },
                  title:{
                   text:null
                  },
                  
                  gridLineWidth: 0,
                },
                legend: {enabled: false},
                series: [{
                    name: measures[0].measureHeaderItem.name,
                    data: data
                }],
                xAxis: {
                  type: axistype,
                  labels: {autoRotation: [0,-90]},
                  plotBands: [{
                        id: 'mask-before',
                        from: f,
                        to: t,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }],
                 showFirstLabel: false,
                 dateTimeLabelFormats: {                      
                        day: '%b %e',
                        week: '%b %e',
                        month: '%b/%\Y',
                        year: '%Y'
                    }  
                },
                credits: { enabled: false },
                plotOptions: {
                    series: {
                        fillColor: {
                            linearGradient: [0, 0, 0, 150],
                            stops: [
                                [0, 'rgb(20,178,226)'],
                                [1, 'rgba(255,255,255,0)']
                            ]
                        },
                        lineWidth: 1,
                        marker: {
                            enabled: false
                        },
                        shadow: false,
                        states: {
                            hover: {
                                lineWidth: 1
                            }
                        },
                        enableMouseTracking: false
                    }
                },
            
            });
          }
          catch (e) 
          {
            console.log("error");
            console.log(e);
          }
      }
      this.setState({
                isLoaded: true
              });
              
      this.master = master;
      this.detail = detail;
      this.props.onLoadingChanged({ isLoading: false });
       
   }


   render() {  
                
       var master = (
          
           <div style={{ position: 'relative', height: '300px'}}>
               <div
                   ref={ref => this.detailcontainer = ref}
               />
           </div>
           );
           
        var detail = (
           <div style={{ position: 'relative', height: '150px'}}>
               <div
                   ref={ref => this.container = ref}
               />
           </div>
       );
       
       return ( <div style={{ position: 'relative', height: '450px', width: '100%'}}> {master} {detail} </div> );  

          
   }
   
   
   
   onError(error) {
       console.log('onError');
       console.log(error);
       
       if (this.master)
       {
          this.master.destroy();
          this.master = null;
       }

       if (this.detail)
       {
          this.detail.destroy();
          this.detail = null;
       }

       
       const errorCode = error.response.status;
       let status;

      switch (errorCode) {
        case HttpStatusCodes.NO_CONTENT:
            status = new RuntimeError(ErrorStates.NO_DATA, error);
            break;
        case HttpStatusCodes.REQUEST_TOO_LONG:
            status =  new RuntimeError(ErrorStates.DATA_TOO_LARGE_TO_COMPUTE, error);
            break;

        case HttpStatusCodes.BAD_REQUEST:
            const message = get(getJSONFromText(error.responseBody), 'error.message', '');

            if (includes(message, 'Attempt to execute protected report unsafely')) {
                status =  new RuntimeError(ErrorStates.PROTECTED_REPORT, error);
            } else {
                status =  new RuntimeError(ErrorStates.BAD_REQUEST, error);
            }
            break;

        case HttpStatusCodes.NOT_FOUND:
            status =  new RuntimeError(ErrorStates.NOT_FOUND, error);
            break;

        case HttpStatusCodes.UNAUTHORIZED:
            status =  new RuntimeError(ErrorStates.UNAUTHORIZED, error);
            break;

        case ErrorCodes.EMPTY_AFM:
            status =  new RuntimeError(ErrorStates.EMPTY_AFM);
            break;

        case ErrorCodes.INVALID_BUCKETS:
            status =  new RuntimeError(ErrorStates.INVALID_BUCKETS);
            break;

        default:
            status =  new RuntimeError(ErrorStates.UNKNOWN_ERROR);
            break;
    }

       this.props.onLoadingChanged({ isLoading: false });
       this.props.onError( status );
   } 

}
