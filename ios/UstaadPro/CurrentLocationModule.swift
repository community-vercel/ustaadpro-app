import Foundation
import CoreLocation

@objc(CurrentLocation)
class CurrentLocationModule: NSObject, CLLocationManagerDelegate {
  
  private var locationManager: CLLocationManager?
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?
  private var resolved = false
  private var timeoutTimer: Timer?
  
  @objc
  func getCurrentLocation(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    self.resolve = resolve
    self.reject = reject
    self.resolved = false
    
    DispatchQueue.main.async {
      let authStatus: CLAuthorizationStatus
      if #available(iOS 14.0, *) {
        authStatus = CLLocationManager().authorizationStatus
      } else {
        authStatus = CLLocationManager.authorizationStatus()
      }
      
      if authStatus == .denied || authStatus == .restricted {
        reject("LOCATION_PERMISSION_DENIED", "Location permission is required.", nil)
        return
      }
      
      self.locationManager = CLLocationManager()
      self.locationManager?.delegate = self
      self.locationManager?.desiredAccuracy = kCLLocationAccuracyBest
      
      if authStatus == .notDetermined {
        self.locationManager?.requestWhenInUseAuthorization()
      } else {
        self.startLocating()
      }
    }
  }
  
  private func startLocating() {
    // Try last known location first
    if let lastLocation = locationManager?.location,
       Date().timeIntervalSince(lastLocation.timestamp) < 300 {
      deliverLocation(lastLocation)
      return
    }
    
    locationManager?.startUpdatingLocation()
    
    // 20 second timeout
    timeoutTimer = Timer.scheduledTimer(withTimeInterval: 20.0, repeats: false) { [weak self] _ in
      guard let self = self, !self.resolved else { return }
      self.resolved = true
      self.locationManager?.stopUpdatingLocation()
      self.reject?("LOCATION_TIMEOUT", "Could not find your location. Please try again.", nil)
    }
  }
  
  private func deliverLocation(_ location: CLLocation) {
    guard !resolved else { return }
    resolved = true
    timeoutTimer?.invalidate()
    locationManager?.stopUpdatingLocation()
    let result: [String: Double] = [
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude
    ]
    resolve?(result)
  }
  
  // MARK: - CLLocationManagerDelegate
  
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    deliverLocation(location)
  }
  
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard !resolved else { return }
    resolved = true
    timeoutTimer?.invalidate()
    locationManager?.stopUpdatingLocation()
    reject?("LOCATION_ERROR", error.localizedDescription, error)
  }
  
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let status: CLAuthorizationStatus
    if #available(iOS 14.0, *) {
      status = manager.authorizationStatus
    } else {
      status = CLLocationManager.authorizationStatus()
    }
    
    switch status {
    case .authorizedWhenInUse, .authorizedAlways:
      startLocating()
    case .denied, .restricted:
      guard !resolved else { return }
      resolved = true
      reject?("LOCATION_PERMISSION_DENIED", "Location permission is required.", nil)
    default:
      break
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
