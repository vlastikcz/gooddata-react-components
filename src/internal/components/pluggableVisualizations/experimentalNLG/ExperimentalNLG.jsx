import * as React from 'react';
import { isEqual, get, includes } from 'lodash';
import { ErrorStates, ErrorCodes } from '../../../../constants/errorStates';
import { RuntimeError } from '../../../../errors/RuntimeError';
//import { ErrorCodes as DataErrorCodes } from '@gooddata/data-layer';
import { colors2Object,numberFormat } from '@gooddata/numberjs';


import { AfmUtils } from '@gooddata/data-layer';

import { RuntimeError, ErrorStates, ErrorCodes } from '@gooddata/react-components';

import * as HttpStatusCodes from 'http-status-codes';

function getJSONFromText(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

/** @augments {React.Component<any, any>} */
export class ExperimentalNLG extends React.Component {

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
                                name: 'NO_DATA',
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
                                name: 'BAD_REQUEST',
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
       var nlg=this;
       
       nlg.attributeName = get(result.executionResponse,'dimensions[1].headers[0].attributeHeader.formOf.name','locations');

       if (result.executionResult.data && result.executionResult.data.length>0)
       {
           //  https://nlg-gd.mml.cz:8443
           fetch('/gdc/ml/nlg/', 
           {
            method: 'post',
            mode: 'cors',
            headers: new Headers(
                       {"Content-Type": "application/json", "Accept": "text/html"}
                    ),
            body: JSON.stringify(result)
           }).then(function(response) {
              console.log(response);
              response.text().then(function (text) {
              console.log(text);
              nlg.txt=text;
              
              
              nlg.setState({
                    isLoaded: true
                  });
              nlg.props.onLoadingChanged({ isLoading: false });
              });
          });
      }
      else
      {
           this.onError( {
                                name: 'NO_DATA',
                                response: {
                                    status: HttpStatusCodes.NO_CONTENT,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: "{\"error\": {\"message\":\"NO_DATA\"}}"
           });   
      }
   
   
 
       
   }


   render() {  
       if (this.state && this.state.error) {
          return <div>Error: {error.message}</div>;
        } else if (!this.state || !this.state.isLoaded) {
          return <div><span style={{"width": "200px","display": "inline-block","backgroundColor": "#eee"}}></span></div>;
        } else {
          
          
          var txt=this.txt;
          
          if (txt) 
          {
             var attr = this.attributeName.toLowerCase();
             var plural;
             
             if (attr[attr.length-1]=='y') plural=attr.substr(0,attr.length-1)+'ies';
             else {
               if (attr[attr.length-1]=='s') plural=attr+'es';
               else plural=attr+'s';
             }
             
             
             txt = txt.replace(/\$/g, '');
             txt = txt.replace(/\.00/g, '');
             txt = txt.replace(/location resorts/g, plural);
             txt = txt.replace(/location resort/g, attr);
          }
          else
          {
             txt="";
          }
          
          return (
            <div className="content" style={{"lineHeight": "normal", "textAlign": "left", "fontSize": "14px"}} dangerouslySetInnerHTML={{__html: txt}}></div>
          );
        }     
   }
   
   
   
   onError(error) {
       console.log('onError');
       console.log(error);
       const errorCode = error.response.status;
       this.txt=null;
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
