#import <React/RCTBridgeDelegate.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface RCTAppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
