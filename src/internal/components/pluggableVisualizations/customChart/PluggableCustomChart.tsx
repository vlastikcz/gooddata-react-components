import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
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
    getMeasureItems,
    sanitizeUnusedFilters
} from '../../../utils/bucketHelper';

import { DEFAULT_LOCALE } from "../../../../constants/localization";

import { CustomChart } from './CustomChart';

import {
    removeInvalidSort
} from '../../../utils/sort';

import { getSupportedProperties } from '../../../utils/propertiesHelper';

import CustomChartConfigurationPanel from '../../configurationPanels/CustomChartConfigurationPanel';

import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";

export class PluggableCustomChart extends AbstractPluggableVisualization {
   protected visualizationProperties: IVisualizationProperties;
   protected isError: boolean;
   protected isLoading: boolean;
   protected mdObject: VisualizationObject.IVisualizationObjectContent;
   private callbacks: IVisCallbacks;
   protected type: string;
   private element: string;
   private configPanelElement:string;
   protected environment: string;
   private locale: ILocale;
   protected supportedPropertiesList: string[];

   constructor(props: IVisConstruct) {
       super();
       this.element = props.element;
       this.environment = props.environment;
       this.callbacks = props.callbacks;
       this.type = 'custom';
       this.locale = props.locale ? props.locale : DEFAULT_LOCALE;
       this.configPanelElement = props.configPanelElement;
  
       this.supportedPropertiesList = [
           'custom.svg'
       ];

       this.initializeProperties(props.visualizationProperties);
   }

   public unmount() {
       unmountComponentAtNode(document.querySelector(this.element) );
   }

   public getExtendedReferencePoint(referencePoint: IReferencePoint): Promise<IExtendedReferencePoint> {
        const clonedReferencePoint = cloneDeep(referencePoint);

        const buckets = get(clonedReferencePoint, BUCKETS, []);
        const measures = getMeasureItems(buckets);

        set(clonedReferencePoint, BUCKETS, [{
            localIdentifier: 'measures',
            items: measures
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

   public update(options: IVisProps, visualizationProperties: IVisualizationProperties
   ,             mdObject: VisualizationObject.IVisualizationObjectContent) {
         const resultSpecWithDimensions: AFM.IResultSpec = {
            ...options.resultSpec,
            dimensions: this.getDimensions()
        };

         const { onError, onLoadingChanged, pushData } = this.callbacks;

         render(
            <CustomChart
                mdObject={mdObject}
                onError={onError}
                onLoadingChanged={onLoadingChanged}
                pushData={pushData}
                dataSource={options.dataSource}
                locale={options.locale}
                resultSpec={resultSpecWithDimensions}
                visualizationProperties={visualizationProperties}
            />,
            document.querySelector(this.element)
        );

         this.visualizationProperties = visualizationProperties;
         this.mdObject = mdObject;

         this.renderConfigurationPanel();
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
        if (document.querySelector(this.configPanelElement)) {
            const pushData = get(this.callbacks, 'pushData', noop);

            const properties: IVisualizationProperties =
                get(this.visualizationProperties, 'properties', {}) as IVisualizationProperties;

            const propertiesMeta = get(this.visualizationProperties, 'propertiesMeta', null);

            render(
                <CustomChartConfigurationPanel
                    properties={properties}
                    propertiesMeta={propertiesMeta}
                    mdObject={this.mdObject}
                    pushData={pushData}
                    locale={this.locale}
                    isError={this.isError}
                    isLoading={this.isLoading}
                />,
                document.querySelector(this.configPanelElement)
            );
        }
    }

   private getUiConfig(): IUiConfig {
       return {
           buckets: {
               measures: {
                    accepts: [METRIC, FACT, ATTRIBUTE],
                    allowsDuplicateItems: true,
                    enabled: true,
                    allowsReordering: true,
                    allowsSwapping: false,
                    itemsLimit: 20,
                    isShowInPercentEnabled: false,
                    isShowInPercentVisible: false,
                    title: 'Measures'
               },
               filters: {
            accepts: [ATTRIBUTE, FACT],
            itemsLimit: 20,
            allowsReordering: false,
            enabled: true,
            isShowInPercentEnabled: false
         }
           }
       }; }

   private getDimensions()
   : AFM.IDimension[] {

       return [
           {
               itemIdentifiers: []
           }, {
               itemIdentifiers: ['measureGroup']
           }
       ]; }

}
