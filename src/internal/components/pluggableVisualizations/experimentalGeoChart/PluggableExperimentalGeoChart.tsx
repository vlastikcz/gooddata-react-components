import * as React from 'react';
import { InjectedIntl } from 'react-intl';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
import * as BucketNames from "../../../../constants/bucketNames";
import get = require('lodash/get');
import set = require('lodash/set');
import noop = require('lodash/noop');
import {
   IReferencePoint,
   IExtendedReferencePoint,
   IVisCallbacks,
   IVisConstruct,
   IVisProps,
   ILocale,
   IVisualizationProperties,
   IUiConfig
} from '../../../interfaces/Visualization';

import {
    METRIC,
    FACT,
    ATTRIBUTE,
    DATE,
    BUCKETS
} from '../../../constants/bucket';

import { setBaseChartUiConfig } from '../../../utils/uiConfigHelpers/baseChartUiConfigHelper';

import {
    getMeasureItems,
    getAllAttributeItemsWithPreference,
    sanitizeUnusedFilters
} from '../../../utils/bucketHelper';

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";

import { ExperimentalGeoChart } from './ExperimentalGeoChart';

import { getSupportedProperties } from '../../../utils/propertiesHelper';

import ExperimentalGeoChartConfigurationPanel from '../../configurationPanels/ExperimentalGeoChartConfigurationPanel';

import {
    removeInvalidSort
} from '../../../utils/sort';
import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";

export class PluggableExperimentalGeoChart extends AbstractPluggableVisualization {
   protected configPanelNode: HTMLElement;
   protected visualizationProperties: IVisualizationProperties;
   protected isError: boolean;
   protected isLoading: boolean;
   protected mdObject: VisualizationObject.IVisualizationObjectContent;
   private callbacks: IVisCallbacks;
   private intl: InjectedIntl;
   private element: string;
   private environment: string;
   private locale: ILocale;
   private type: string;
   protected supportedPropertiesList: string[];

   constructor(props: IVisConstruct) {
       super();
       this.element = props.element;
       this.environment = props.environment;
       this.callbacks = props.callbacks;
       this.locale = props.locale ? props.locale : DEFAULT_LOCALE;
       this.intl = createInternalIntl(this.locale);
       this.configPanelNode = document.querySelector(props.configPanelElement) as HTMLElement;
       this.isError = false;
       this.isLoading = false;

       this.type = 'experimental_geochart';
       this.supportedPropertiesList = [
           'geochart.type', 'geochart.provider', 'geochart.color', 'geochart.bounds', 'geochart.autozoom',
           'geochart.intensity', 'geochart.radius'
       ];
       this.initializeProperties(props.visualizationProperties);
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

         const { afterRender, onError, onLoadingChanged, pushData } = this.callbacks;

         render(
            <ExperimentalGeoChart
                locale={options.locale}
                mdObject={mdObject}
                afterRender={afterRender}
                onError={onError}
                onLoadingChanged={onLoadingChanged}
                pushData={pushData}
                dataSource={options.dataSource}
                resultSpec={resultSpecWithDimensions}
                visualizationProperties={visualizationProperties}
                environment={this.environment}
            />,
            document.querySelector(this.element)
        );

         this.visualizationProperties = visualizationProperties;
         this.mdObject = mdObject;

         this.renderConfigurationPanel();
    }

   public getExtendedReferencePoint(referencePoint: IReferencePoint): Promise<IExtendedReferencePoint> {

        const clonedReferencePoint = cloneDeep(referencePoint);
        const buckets = get(clonedReferencePoint, 'buckets', []);
        const measures = getMeasureItems(buckets).slice(0, 1);
        let attributes = getAllAttributeItemsWithPreference(buckets,
           [BucketNames.TREND, BucketNames.VIEW, BucketNames.SEGMENT, BucketNames.STACK]
            ).slice(0, 1);
        const isLatLong: boolean = (attributes.length === 0) ? false :
         (attributes[0].attribute.search(/latitude|longitude|gps/i) !== -1);

        if (isLatLong) { attributes = getAllAttributeItemsWithPreference(buckets, [BucketNames.TREND,
                                                                                 BucketNames.VIEW,
                                                                                 BucketNames.SEGMENT,
                                                                                 BucketNames.STACK]
            ).slice(0, 2);
        }

        const newReferencePoint: IExtendedReferencePoint = {
            ...clonedReferencePoint,
            uiConfig: this.getUiConfig(isLatLong)
        };

        set(newReferencePoint, BUCKETS, [{
            localIdentifier: BucketNames.MEASURES,
            items: measures
        },
        {
            localIdentifier: BucketNames.VIEW,
            items: attributes
        }]);

        const referencePointWithUiConfig = setBaseChartUiConfig(newReferencePoint, this.intl, this.type);

        removeInvalidSort(referencePointWithUiConfig);

        return Promise.resolve(
            sanitizeUnusedFilters(referencePointWithUiConfig, clonedReferencePoint)
        );
     }

   protected initializeProperties(visualizationProperties: IVisualizationProperties) {
        const supportedProperties = getSupportedProperties(visualizationProperties, this.supportedPropertiesList);
        const initialProperties = {
            supportedProperties: { controls: supportedProperties },
            supportedPropertiesList: this.supportedPropertiesList
        };

        this.callbacks.pushData({
            initialProperties
        });
    }

   protected renderConfigurationPanel() {
        if (this.configPanelNode) {
            const pushData = get(this.callbacks, 'pushData', noop);

            const properties: IVisualizationProperties =
                get(this.visualizationProperties, 'properties', {}) as IVisualizationProperties;

            const propertiesMeta = get(this.visualizationProperties, 'propertiesMeta', null);

            render(
                <ExperimentalGeoChartConfigurationPanel
                    properties={properties}
                    propertiesMeta={propertiesMeta}
                    mdObject={this.mdObject}
                    locale={this.locale}
                    pushData={pushData}
                    isError={this.isError}
                    isLoading={this.isLoading}
                />,
                this.configPanelNode
            );
        }
    }

   private getUiConfig(isLatLong: boolean): IUiConfig {
       return {
         buckets: {
               measures: {
                    accepts: [METRIC, FACT, ATTRIBUTE],
                    allowsDuplicateItems: true,
                    enabled: true,
                    allowsReordering: false,
                    allowsSwapping: true,
                    itemsLimit: 1,
                    isShowInPercentEnabled: false,
                    isShowInPercentVisible: true,
                    title: 'Measures'

               },
               view: {
            accepts: [ATTRIBUTE, DATE],
            itemsLimit: (isLatLong ? 2 : 1),
            allowsSwapping: (isLatLong ? false : true),
            allowsReordering: (isLatLong ? true : false),
            enabled: true,
            isShowInPercentEnabled: false
         },
               filters: {
            accepts: [ATTRIBUTE, DATE],
            itemsLimit: 20,
            allowsReordering: false,
            enabled: true,
            isShowInPercentEnabled: false
         }
       },
         recommendations: {},
         supportedOverTimeComparisonTypes: [],
         openAsReport: { supported: false }
       }; }

   private getDimensions(mdObject: VisualizationObject.IVisualizationObjectContent): AFM.IDimension[] {
       const view = mdObject.buckets.find(bucket => bucket.localIdentifier === 'view') ;

       return [
           {
               itemIdentifiers: ['measureGroup']
           },
           {
               itemIdentifiers: ((view && view.items) || []).map(
                (attribute: VisualizationObject.IVisualizationAttribute) =>
                  attribute.visualizationAttribute.localIdentifier)
           }
       ]; }

}
