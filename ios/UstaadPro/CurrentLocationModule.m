#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CurrentLocation, NSObject)

RCT_EXTERN_METHOD(getCurrentLocation:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
