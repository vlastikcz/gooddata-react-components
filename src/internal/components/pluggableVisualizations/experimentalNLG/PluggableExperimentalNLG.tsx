import * as React from 'react';
import { InjectedIntl } from 'react-intl';
import { render, unmountComponentAtNode } from 'react-dom';
import cloneDeep = require('lodash/cloneDeep');
import { VisualizationObject, AFM } from '@gooddata/typings';
import * as BucketNames from "../../../../constants/bucketNames";

import get = require('lodash/get');
import set = require('lodash/set');
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
    getAllAttributeItemsWithPreference,
    sanitizeUnusedFilters
} from '../../../utils/bucketHelper';

import { createInternalIntl } from "../../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../../constants/localization";

import { ExperimentalNLG } from './ExperimentalNLG';

import {
    removeInvalidSort
} from '../../../utils/sort';
import { AbstractPluggableVisualization } from "../AbstractPluggableVisualization";

export class PluggableExperimentalNLG extends AbstractPluggableVisualization {
   private callbacks: IVisCallbacks;
   protected intl: InjectedIntl;
   private element: string;
   protected environment: string;
   private locale: ILocale;

   constructor(props: IVisConstruct) {
       super();
       this.element = props.element;
       this.environment = props.environment;
       this.callbacks = props.callbacks;
       this.locale = props.locale ? props.locale : DEFAULT_LOCALE;
       this.intl = createInternalIntl(this.locale);
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

         const { onError, onLoadingChanged, pushData } = this.callbacks;

         render(
            <ExperimentalNLG
                mdObject={mdObject}
                onError={onError}
                onLoadingChanged={onLoadingChanged}
                pushData={pushData}
                dataSource={options.dataSource}
                resultSpec={resultSpecWithDimensions}
                visualizationProperties={visualizationProperties}
            />,
            document.querySelector(this.element)
        );
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
            );
        }

        set(clonedReferencePoint, BUCKETS, [{
            localIdentifier: 'measures',
            items: measures
        }, {
            localIdentifier: 'attributes',
            items: attributes
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
                   allowsSwapping: true,
                   itemsLimit: 20,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
              },
               attributes: {
                   accepts: [ATTRIBUTE, DATE],
                   title: 'Attributes',
                   itemsLimit: 20,
                   allowsSwapping: false,
                   allowsReordering: true,
                   enabled: true,
                   isShowInPercentEnabled: false,
                   isShowInPercentVisible: false
              },
               filters: {
                   accepts: [ATTRIBUTE, DATE],
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
