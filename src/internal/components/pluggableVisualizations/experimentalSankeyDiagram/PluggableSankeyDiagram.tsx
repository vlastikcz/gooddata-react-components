import * as React from 'react';
import { InjectedIntl } from 'react-intl';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
import { DataLayer } from '@gooddata/gooddata-js';
import { colors2Object,numberFormat } from '@gooddata/numberjs';

import * as BucketNames from "../../../../constants/bucketNames";

import { get, set, isEqual, tail, escape, unescape } from 'lodash';

import * as Highcharts from 'highcharts';

// require('highcharts/modules/wordcloud')(Highcharts);

import HighchartsSankey from 'highcharts/modules/sankey';

HighchartsSankey(Highcharts);

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
    DATE,
    BUCKETS
} from '../../../constants/bucket';

import {
    getMeasureItems,
    sanitizeUnusedFilters,
    getAllAttributeItemsWithPreference,
    getStackItems,
    getAttributeItemsWithoutStacks,
    isDate
} from '../../../utils/bucketHelper';

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";

import {
    removeInvalidSort
} from '../../../utils/sort';
import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";

export class PluggableSankeyDiagram extends AbstractPluggableVisualization {
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

   /*public update(options: IVisProps, visualizationProperties: IVisualizationProperties,
                 mdObject: VisualizationObject.IVisualizationObjectContent) {
       render(<WordCloudChart />, document.querySelector(this.element));
   }*/

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
      const DEFAULT_COLOR_PALETTE = [
        'rgb(20,178,226)',
        'rgb(0,193,141)',
        'rgb(229,77,66)',
        'rgb(241,134,0)',
        'rgb(171,85,163)',
    
        'rgb(244,213,33)',
        'rgb(148,161,174)',
        'rgb(107,191,216)',
        'rgb(181,136,177)',
        'rgb(238,135,128)',
    
        'rgb(241,171,84)',
        'rgb(133,209,188)',
        'rgb(41,117,170)',
        'rgb(4,140,103)',
        'rgb(181,60,51)',
    
        'rgb(163,101,46)',
        'rgb(140,57,132)',
        'rgb(136,219,244)',
        'rgb(189,234,222)',
        'rgb(239,197,194)'
      ];
      
      const customEscape = (str: string) => str && escape(unescape(str));

      this.callbacks.onLoadingChanged({ isLoading: false });

      try {

      if (result.executionResponse.dimensions[1].headers[0].measureGroupHeader.items.length === 0) {
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

      if (result.executionResult.data.length === 0) {
         const error: any = {
                                message: 'NO_DATA'
                            };
         this.onError(error);
         return;
      }       
        
      const data = result.executionResult.data.map((item: string, itemIndex: number) => {
            return [ result.executionResult.headerItems[0][0][itemIndex].attributeHeaderItem.name,
                     result.executionResult.headerItems[0][1][itemIndex].attributeHeaderItem.name,
                     parseValue(item)                            
                           ];                         
           });
      const measureName = result.executionResult.headerItems[1][0][0].measureHeaderItem.name;
      const format = result.executionResponse.dimensions[1].headers[0].measureGroupHeader.items[0].measureHeaderItem.format;
      const fromName = get(result,'executionResponse.dimensions[0].headers[0].attributeHeader.formOf.name','');
      const toName = get(result,'executionResponse.dimensions[0].headers[1].attributeHeader.formOf.name','');
      

      const chartOptions: any = {
        chart: {
            type: 'sankey'
        },
        plotOptions: {
            sankey: {
                colors: DEFAULT_COLOR_PALETTE,
                dataLabels: {
                    color: 'rgb(0,0,0)'  ,
                    borderWidth: 0,
                    shadow: false,
                     style: {
                      
                        textOutline : 'none'
                    }
                    
                }
            }
        },
         series: [{
            name: measureName,
            keys: ['from', 'to', 'weight'],
            format: format,
            data      
        }],
        legend: {
            enabled: false
        },
        title: {
            text: null
        },
        credits: { enabled: false },
        tooltip: {borderWidth: 0, borderRadius: 0, shadow: false, backgroundColor: undefined, followPointer: true, useHTML: true,
                          formatter: function() {
                          var point=this.point;  
                         
                          const numVal = point.weight ? point.weight : point.sum;                      
                          const val=customEscape(colors2Object(numberFormat(numVal,point.series.userOptions.format)).label);
                          
                      return  '<div class="hc-tooltip gd-viz-tooltip"> <span class="stroke gd-viz-tooltip-stroke" style="border-top-color: ' + point.color +
                      '" ></span> <div class="content gd-viz-tooltip-content">'+
                      '<table class="tt-values gd-viz-tooltip-table"><tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+point.series.name+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+val+'</td></tr>'+
                      ( point.weight ?
                      '<tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+fromName+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+point.from+'</td></tr>'+
                      '<tr class=\"gd-viz-tooltip-table-row\"><td class="gd-viz-tooltip-table-cell title gd-viz-tooltip-table-title">'+toName+'</td><td class="gd-viz-tooltip-table-cell value gd-viz-tooltip-table-value">'+point.to+'</td></tr>' : '' )+
                      '</table></div><div class="gd-viz-tooltip-tail tail1 gd-viz-tooltip-tail1 center"></div><div class="gd-viz-tooltip-tail tail2 gd-viz-tooltip-tail2 center"></div></div>';
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
        const allAttributes = getAllAttributeItemsWithPreference(
            buckets,
            [BucketNames.VIEW, BucketNames.TREND, BucketNames.STACK, BucketNames.SEGMENT]
        );
        let stacks = getStackItems(buckets);

        if (measures.length <= 1 && allAttributes.length > 1) {
            // first attribute is taken, find next available non-date attribute
            const attributesWithoutFirst = tail(allAttributes);
            const nonDate = attributesWithoutFirst.filter((attribute: any) => !isDate(attribute));
            stacks = nonDate.slice(0, 1);
        }


        set(clonedReferencePoint, BUCKETS, [{
            localIdentifier: BucketNames.MEASURES,
            items: measures.slice(0,1)
        }, {
            localIdentifier: BucketNames.VIEW,
            items: getAttributeItemsWithoutStacks(buckets).slice(0, 1)
        }, {
            localIdentifier: BucketNames.STACK,
            items: stacks
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
                   allowsReordering: false,
                   allowsSwapping: true,
                   itemsLimit: 1,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               view: {
                   accepts: [ATTRIBUTE, DATE],
                   title: 'From',
                   itemsLimit: 1,
                   allowsSwapping: true,
                   allowsReordering: false,
                   enabled: true,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
               },
               stack: {
                   accepts: [ATTRIBUTE, DATE],
                   title: 'To',
                   itemsLimit: 1,
                   allowsSwapping: true,
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

    const view: VisualizationObject.IBucket = mdObject.buckets
            .find(bucket => bucket.localIdentifier === BucketNames.VIEW);

    const stack: VisualizationObject.IBucket = mdObject.buckets
        .find(bucket => bucket.localIdentifier === BucketNames.STACK);

    

     return [
        {
            
            itemIdentifiers: (view && view.items || [])
                .map((item: any) => item.visualizationAttribute.localIdentifier)
                .concat((stack && stack.items || [])
                .map((item: any) => item.visualizationAttribute.localIdentifier))
        },
        {
            itemIdentifiers: ['measureGroup']
        }
    ];

    }

}
