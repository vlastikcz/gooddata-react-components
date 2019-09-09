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

// require('highcharts/modules/wordcloud')(Highcharts);

import HighchartsPareto from 'highcharts/modules/pareto';

HighchartsPareto(Highcharts);

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

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";

import {
    removeInvalidSort
} from '../../../utils/sort';
import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";

export class PluggableParetoChart extends AbstractPluggableVisualization {
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

      this.callbacks.onLoadingChanged({ isLoading: false });

      const customEscape = (str: string) => str && escape(unescape(str));

      try {

      if (result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items.length === 0) {
         const error: any = {
                                message: 'INVALID_BUCKETS'
                            };
         this.onError(error);
         return;
      }

      if (result.executionResponse.dimensions[1].headers.length === 0) {
         const error: any = {
                                message: 'BAD_REQUEST'
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
      const viewByAttribute = result.executionResult.headerItems[1][0];
      const data = result.executionResult.data[0].map((item: string) => parseValue(item) );
      
      const categories = viewByAttribute.map((item: any) => item.attributeHeaderItem.name);         

      const format = result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items[0].measureHeaderItem.format;
      const attributeName = result.executionResponse.dimensions[1].headers[0].attributeHeader.formOf.name;
      const measureName = result.executionResult.headerItems[0][0][0].measureHeaderItem.name;

      const chartOptions: any = {
        chart: {
            type: 'pareto'
        },
        plotOptions: {
          wordcloud: {
                       colorByPoint: false
          }
        },
        legend: {
            enabled: false
        },
        series:[{
            type: 'pareto',
            name: 'Cumulative percentage',
            format:  '##.0\\%',
            yAxis: 1,
            zIndex: 10,
            baseSeries: 1,
            color: 'rgb(0,193,141)'
          },
          {
            type: 'column',
            zIndex: 2,
            data,
            format: format,
            name: measureName,
            color: 'rgb(20,178,226)'
          }],
        xAxis: {categories},
        yAxis: [{
            title: {
                text: ''
            }
        }, {
            title: {
                text: ''
            },
            minPadding: 0,
            maxPadding: 0,
            max: 100,
            min: 0,
            opposite: true,
            labels: {
                format: "{value}%"
            }
        }],
        title: {
            text: null
        },
        credits: { enabled: false },
        tooltip: {borderWidth: 0, borderRadius: 0, shadow: false, backgroundColor: undefined, followPointer: true, useHTML: true,
                          formatter: function() {
                          var point=this.point;                         
                          const val=customEscape(colors2Object(numberFormat(point.y,point.series.userOptions.format)).label);
                      return  '<div class="hc-tooltip gd-viz-tooltip"> <span class="stroke gd-viz-tooltip-stroke" style="border-top-color: '+point.series.color+'" ></span> <div class="content gd-viz-tooltip-content">'+
                      '<table class="tt-values gd-viz-tooltip-table"><tr class=\"gd-viz-tooltip-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+point.series.name+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+val+'</td></tr>'+
                      '<tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+attributeName+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+point.category+'</td></tr></table></div><div class="gd-viz-tooltip-tail tail1 gd-viz-tooltip-tail1 center"></div><div class="gd-viz-tooltip-tail tail2 gd-viz-tooltip-tail2 center"></div></div>';
                      }
                }
      };
      
 
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
            items: measures.slice(0,1)
        }, {
            localIdentifier: BucketNames.VIEW,
            items: attributes.slice(0,1)
        }]);
        
        
        set(clonedReferencePoint,'properties.sortItems', (measures.length>0) ? [
        {
                measureSortItem: {
                    direction: 'desc',
                    locators: [
                        {
                            measureLocatorItem: {
                                measureIdentifier: measures[0].localIdentifier
                            }
                        }
                    ]
                }
            }
        ] : []);

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
                   itemIdentifiers: ['measureGroup']
               },
               {
                   itemIdentifiers: attributes
               }
           ];
       } else {
       return [
               {
                   itemIdentifiers: ['measureGroup']
               },
               {
                   itemIdentifiers: []
               }
           ];
       }

    }

}
