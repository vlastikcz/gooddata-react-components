import * as React from 'react';
import { InjectedIntl } from 'react-intl';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
import { DataLayer } from '@gooddata/gooddata-js';

import * as BucketNames from "../../../../constants/bucketNames";

import { get, set, isEqual, escape, unescape } from 'lodash';
import { colors2Object,numberFormat } from '@gooddata/numberjs';

import * as Highcharts from 'highcharts';

// require('highcharts/modules/wordcloud')(Highcharts);

import HighchartsBullet from 'highcharts/modules/bullet';

HighchartsBullet(Highcharts);

import {
   IReferencePoint,
   IExtendedReferencePoint,
   IVisCallbacks,
   IVisConstruct,
   IVisProps,
   ILocale,
   IUiConfig,
   IVisualizationProperties
} from '../../../interfaces/Visualization';

import {
    METRIC,
    FACT,
    ATTRIBUTE,
    BUCKETS
} from '../../../constants/bucket';

import {
    sanitizeUnusedFilters,
    getBucketItemsByType,
    getAllItemsByType
} from '../../../utils/bucketHelper';

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";

import {
    removeInvalidSort
} from '../../../utils/sort';

import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";



export class PluggableBulletChart extends AbstractPluggableVisualization {
   private callbacks: IVisCallbacks;
   protected intl: InjectedIntl;
   private element: string;
   protected environment: string;
   private locale: ILocale;
   private options: IVisProps;
   protected visualizationProperties: IVisualizationProperties;
   private container: HTMLDivElement;
   private resultSpec: AFM.IResultSpec;
   private chart: any;
   private mdObject: VisualizationObject.IVisualizationObjectContent;
   
   constructor(props: IVisConstruct) {
       super();
       this.element = props.element;
       this.environment = props.environment;
       this.callbacks = props.callbacks;
       this.locale = props.locale ? props.locale : DEFAULT_LOCALE;
       this.intl = createInternalIntl(this.locale);
       this.chart = null;
   }
   public unmount() {
       unmountComponentAtNode(document.querySelector(this.element) );
   }

   public update(options: IVisProps, visualizationProperties: IVisualizationProperties
   ,             mdObject: VisualizationObject.IVisualizationObjectContent) {

         const resultSpecWithDimensions: AFM.IResultSpec = {
            ...options.resultSpec,
            dimensions: this.getDimensions(mdObject)
        };
         this.mdObject = mdObject;
         render(
            <div style={{ position: 'relative', height: '100%', width: '100%' }} ref={ref => this.container = ref}>
            </div>,
            document.querySelector(this.element)
        );

         if (options && options.dataSource) {
           if (!this.options || !DataLayer.DataSourceUtils.dataSourcesMatch(this.options.dataSource, options.dataSource)
                    || !isEqual(this.resultSpec, resultSpecWithDimensions)) {

                const { onError, onLoadingChanged } = this.callbacks;
                this.options = options;
                this.resultSpec = resultSpecWithDimensions;
                this.visualizationProperties = visualizationProperties;

                onLoadingChanged({ isLoading: true });
                options.dataSource.getData(resultSpecWithDimensions)
                .then(this.setDataResult.bind(this))
                .catch(onError.bind(this));

            }
        }

    }

   public setDataResult(result: any) {
       this.callbacks.pushData({ result });

       if (result.executionResult) {
           this.createChart(result);
       }
   }

   public createChart(result: any) {
      function parseValue(value: any): number {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? null : parsedValue; // eslint-disable-line no-restricted-globals
      }

      console.log(result);
      this.callbacks.onLoadingChanged({ isLoading: false });

      try {

      if (result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items.length === 0) {
         const error: any = {
                                message: 'INVALID_BUCKETS'
                            };
         this.onError(error);
         return;
      }

      if (result.executionResponse.dimensions[0].headers.length === 0) {
         const error: any = {
                                message: 'BAD_REQUEST'
                            };
         this.onError(error);
         return;
      }

      if ((result.executionResult.data.length === 0) || (result.executionResult.data[0] === null)) {
         const error: any = {
                                message: 'NO_DATA'
                            };
         this.onError(error);
         return;
      }
      
      const measureGroup: any = get(result,'executionResponse.dimensions[0].headers[0].measureGroupHeader',[]);
      var measureGroupIdentifiers=measureGroup.items.map((item: any) => { return item.measureHeaderItem.localIdentifier});
      var measureBuckets: any={};
    
      this.mdObject.buckets.forEach((bucket) => {      
          const bucketItems = bucket.items;
          const metricIndexes: number[] = [];
          bucketItems.forEach((item: any) => {
             if (item.measure)
             { 
                 const metricIndex: number = measureGroupIdentifiers.indexOf(item.measure.localIdentifier);
                 metricIndexes.push(metricIndex);
             }
          });
          measureBuckets[bucket.localIdentifier]=metricIndexes;
      });

      const values = result.executionResult.data.map( (item: string) => parseValue(item));
      
      const data = [{ y: (measureBuckets.measures ? values [measureBuckets.measures[0]]:null),
                     target: (measureBuckets.secondary_measures ? values [measureBuckets.secondary_measures[0]]:null) }];
                     
      
      var last=0;
      const bands=[];
           
      const bandMeasures=measureBuckets.tertiary_measures;
      if (bandMeasures)
      for (var i=0;i<bandMeasures.length;i++)
      {
        const opacity=(bandMeasures.length>1)? 0.4*(bandMeasures.length-i)/bandMeasures.length : 0.2;
        
        bands.push( { from: last,
                      to: values[bandMeasures[i]],
                      color: 'rgba(0,0,0,'+opacity+')' } );
        last=values[bandMeasures[i]];
      }
        
      const customEscape = (str: string) => str && escape(unescape(str));
      const format = result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items[0].measureHeaderItem.format;

      const chartOptions: any = {
        chart: {
            inverted: true,
            marginLeft: 135,
            type: 'bullet',
            height: '100px'
        },
        xAxis: {
            categories:[result.executionResult.headerItems[0][0][0].measureHeaderItem.name],
        },
        yAxis: {
            plotBands: bands,
            gridLineWidth: 0
        },
        plotOptions: {
            bullet: {
              targetOptions: { color: 'black'}
            },
            series: {
                maxPointWidth: 100,
                pointPadding: 0.2,
                borderWidth: 0,
                targetOptions: {
                    width: '200%'
                }
            }
        },
        legend: {
            enabled: false
        },
        series: [{
            data,
            color: 'rgb(20,178,226)',
            dataLabels: { enabled: true,
                          shadown: false,
                          style: { textOutline: "none" } },
            name: result.executionResult.headerItems[0][0][0].measureHeaderItem.name,
            visible: true,
            format: format                         
        }],
        title: {
            text: null
        },
        credits: { enabled: false },
        tooltip: {borderWidth: 0, borderRadius: 0, shadow: false, backgroundColor: undefined, followPointer: false, useHTML: true, 
                          formatter: function() {
                          var point=this.point;                          
                          const val=customEscape(colors2Object(numberFormat(point.y,point.series.userOptions.format)).label);
                      return  '<div class="hc-tooltip gd-viz-tooltip"> <span class="stroke gd-viz-tooltip-stroke" style="border-top-color: '+point.series.color+'" ></span> <div class="content gd-viz-tooltip-content">'+
                      '<table class="tt-values gd-viz-tooltip-table"><tr class=\"gd-viz-tooltip-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+point.series.name+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+val+'</td></tr>'+
                      '</table></div><div class="gd-viz-tooltip-tail tail1 gd-viz-tooltip-tail1 center"></div><div class="gd-viz-tooltip-tail tail2 gd-viz-tooltip-tail2 center"></div></div>';
                      }
                }
      };
      
      console.log(chartOptions);

      this.chart = Highcharts.chart(this.container, chartOptions);
     } catch (e) {
        console.log(e);
        throw e;
     }
   }

   public onError(error: any) {
 
     if (this.chart)
     {
        this.chart.destroy();
        this.chart = null;
     }
     this.callbacks.onLoadingChanged({ isLoading: false });
     this.callbacks.onError(error);
   }

   public getExtendedReferencePoint(referencePoint: IReferencePoint): Promise<IExtendedReferencePoint> {
        const clonedReferencePoint = cloneDeep(referencePoint);

        const buckets = get(clonedReferencePoint, BUCKETS, []);
        let measures = getBucketItemsByType(buckets,BucketNames.MEASURES,[METRIC]);
        let target = getBucketItemsByType(buckets,BucketNames.SECONDARY_MEASURES,[METRIC]);
        let range = getBucketItemsByType(buckets,BucketNames.TERTIARY_MEASURES,[METRIC]);
        let allmeasures = getAllItemsByType(clonedReferencePoint.buckets, [METRIC]);
        
        allmeasures.forEach( (measure: any) => {
        
          if (! measures[0])
          {
             if (  (target.indexOf(measure)==-1) &&  ( range.indexOf(measure)==-1) ) measures=[measure];
          }
          else
          {
            if (! target[0])
            {
             if (  (measures[0]!=measure) &&  ( range.indexOf(measure)==-1) ) target=[measure];
            }
            else
            {             
                 if (  (measures[0]!=measure) &&  ( target.indexOf(measure)==-1)&&  ( range.indexOf(measure)==-1) )  range.push(measure);                          
            }
          }
        
        } );

        set(clonedReferencePoint, BUCKETS, [{
            localIdentifier: BucketNames.MEASURES,
            items: measures.slice(0,1)
        }, {
            localIdentifier: BucketNames.SECONDARY_MEASURES,
            items: target.slice(0,1)
        },{
            localIdentifier: BucketNames.TERTIARY_MEASURES,
            items: range
        }
        ]);
        const extendedRefrencePoint: IExtendedReferencePoint = {
            ...clonedReferencePoint,
            uiConfig: this.getUiConfig()
        };
        removeInvalidSort(extendedRefrencePoint);

        return Promise.resolve(
            sanitizeUnusedFilters(extendedRefrencePoint, clonedReferencePoint)
        );

    }

   private getUiConfig(): IUiConfig {
       return {
           buckets: {
               measures: {
                   accepts: [METRIC, FACT, ATTRIBUTE],
                   title: 'Measures',
                   allowsDuplicateItems: true,
                   enabled: true,
                   allowsReordering: false,
                   allowsSwapping: true,
                   itemsLimit: 1,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               secondary_measures: {
                   accepts: [METRIC, FACT, ATTRIBUTE],
                   title: 'Target',
                   allowsDuplicateItems: true,
                   enabled: true,
                   allowsReordering: false,
                   allowsSwapping: true,
                   itemsLimit: 1,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               tertiary_measures: {
                   accepts: [METRIC, FACT, ATTRIBUTE],
                   title: 'Range',
                   allowsDuplicateItems: true,
                   enabled: true,
                   allowsReordering: true,
                   allowsSwapping: false,
                   itemsLimit: 20,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               filters: {
            accepts: ['attribute', 'date'],
            itemsLimit: 20,
            allowsReordering: false,
            enabled: true,
            isShowInPercentEnabled: false
         }
           }
       }; }

   private getDimensions(mdObject: VisualizationObject.IVisualizationObjectContent)
   : AFM.IDimension[] {
       if (mdObject)
       {
         return [
               {
                   itemIdentifiers: ['measureGroup']
               }
             ];
       } else {
         return null;
       }
       

    }

}
