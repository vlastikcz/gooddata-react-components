import * as React from 'react';
import { InjectedIntl } from 'react-intl';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
import { DataLayer } from '@gooddata/gooddata-js';
import { colors2Object,numberFormat } from '@gooddata/numberjs';


import * as BucketNames from "../../../../constants/bucketNames";

import { get, set, isEqual, escape, unescape } from 'lodash';

import * as Highcharts from 'highcharts';

import HighchartsMore from 'highcharts/highcharts-more'; 

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";


HighchartsMore(Highcharts);

import {
   IReferencePoint,
   IExtendedReferencePoint,
   IVisCallbacks,
   IVisConstruct,
   IVisProps,
   ILocale,
   IUiConfig,
   IBucketItem,
   IVisualizationProperties
} from '../../../interfaces/Visualization';

import {
    METRIC,
    FACT,
    ATTRIBUTE,
    DATE,
    BUCKETS
} from '../../../constants/bucket';

import {
    getMeasureItems,
    getDateItems,
    sanitizeUnusedFilters,
    getAllAttributeItemsWithPreference
} from '../../../utils/bucketHelper';


import {
    removeInvalidSort
} from '../../../utils/sort';

import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";



export class PluggableBoxplotChart extends AbstractPluggableVisualization {
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

      const customEscape = (str: string) => str && escape(unescape(str));

      try {

      if (result.executionResponse.dimensions[1].headers[0].measureGroupHeader.items.length === 0) {
         const error: any = {
                                message: 'INVALID_BUCKETS'
                            };
         this.onError(error);
         return;
      }
      
      if (result.executionResult.data.length === 0) {
         const error: any = {
                                message: 'NO_DATA'
                            };
         this.onError(error);
         return;
      }
      const viewByAttribute = get(result,'executionResult.headerItems[0][0]',null);
      const data = result.executionResult.data.map((item: any) => {      
         return item.map( (value: string) => parseValue(value) ).reverse();       
      });
      
      const categories = viewByAttribute ? viewByAttribute.map((item: any) => item.attributeHeaderItem.name): [''];         

      const format = result.executionResponse.dimensions[1].headers[0].measureGroupHeader.items[0].measureHeaderItem.format;
      const attributeName = get(result,'executionResponse.dimensions[0].headers[0].attributeHeader.formOf.name','');

      const chartOptions: any = {
        chart: {
            type: 'boxplot'
        },
         plotOptions: {
            boxplot: {
                fillColor: 'rgba(20,178,226,0.3)',
                lineWidth: 2,
                medianColor: 'rgb(20,178,226)',
                medianWidth: 3,
                stemColor: 'rgb(20,178,226)',
                stemDashStyle: 'solid',
                stemWidth: 2,
                whiskerColor: 'rgb(20,178,226)',
                whiskerLength: '50%',
                whiskerWidth: 2
            }
        },
        legend: {
            enabled: false
        },
        series:[{
            data,
            format: format,
            color: 'rgb(20,178,226)'
          }],
        xAxis: { categories },
        yAxis: {
            title: {
                text: null
            }
        },
        title: {
            text: null
        },
        credits: { enabled: false },
        tooltip: {borderWidth: 0, borderRadius: 0, shadow: false, useHTML: true,
                          formatter: function() {
                          var point=this.point; 
                      return  '<div class="hc-tooltip gd-viz-tooltip"> <span class="hc-tooltip gd-viz-tooltip-stroke" style="border-top-color: '+point.series.color+'" ></span> <div class="content gd-viz-tooltip-content">'+
                      '<table class="tt-values gd-viz-tooltip-table"><tr class=\"gd-viz-tooltip-table-row\">' +
                      '<td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">Max</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+customEscape(colors2Object(numberFormat(point.high,point.series.userOptions.format)).label)+'</td></tr>'+
                      '<td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">Q3</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+customEscape(colors2Object(numberFormat(point.q3,point.series.userOptions.format)).label)+'</td></tr>'+
                      '<td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">Median</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+customEscape(colors2Object(numberFormat(point.median,point.series.userOptions.format)).label)+'</td></tr>'+
                      '<td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">Q1</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+customEscape(colors2Object(numberFormat(point.q1,point.series.userOptions.format)).label)+'</td></tr>'+
                      '<td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">Min</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+customEscape(colors2Object(numberFormat(point.low,point.series.userOptions.format)).label)+'</td></tr>'+
                      '<tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+attributeName+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+point.category+'</td></tr></table></div><div class="gd-viz-tooltip-tail tail1 gd-viz-tooltip-tail1 center"></div><div class="gd-viz-tooltip-tail tail2 gd-viz-tooltip-tail2 center"></div></div>';
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
        const measures = getMeasureItems(buckets);

        let attributes: IBucketItem[] = [];
        const dateItems = getDateItems(buckets);

        if (dateItems.length) {
            attributes = [...dateItems];
        } else {
            attributes = getAllAttributeItemsWithPreference(buckets, [BucketNames.TREND,
                                                                      BucketNames.VIEW,
                                                                      BucketNames.SEGMENT,
                                                                      BucketNames.STACK]
            ).slice(0, 1);
        }

        set(clonedReferencePoint, BUCKETS, [{
            localIdentifier:  BucketNames.MEASURES,
            items: measures.slice(0,5)
        }, {
            localIdentifier: BucketNames.VIEW,
            items: attributes.slice(0,1)
        }]);

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
                   allowsReordering: true,
                   allowsSwapping: false,
                   itemsLimit: 5,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               view: {
                   accepts: [ATTRIBUTE, DATE],
                   title: 'View By',
                   itemsLimit: 1,
                   allowsSwapping: false,
                   allowsReordering: false,
                   enabled: true,
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

       if (mdObject.buckets.length > 1) {
           const items = mdObject.buckets[1].items;
           const attributes = items.map((item: any) => item.visualizationAttribute.localIdentifier);

           return [
               {
                   itemIdentifiers: attributes
               },
               {
                   itemIdentifiers: ['measureGroup']
               }
           ];
       } else {
       return [
               {
                   itemIdentifiers: []
               },
               {
                   itemIdentifiers: ['measureGroup']
               }
           ];
       }

    }

}
