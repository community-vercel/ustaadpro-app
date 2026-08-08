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
    DispatchQueue.main.async {
      // A previous call's CLLocationManager may still be alive and waiting on
      // a delegate callback (e.g. the user backgrounded the app to flip
      // permission on in Settings, and the old manager is still registered
      // as our delegate). Detach it before starting a new call so its late
      // callback can never fire against this call's resolve/reject and crash
      // the bridge with "already invoked".
      self.timeoutTimer?.invalidate()
      self.locationManager?.stopUpdatingLocation()
      self.locationManager?.delegate = nil

      self.resolve = resolve
      self.reject = reject
      self.resolved = false

      let authStatus: CLAuthorizationStatus
      if #available(iOS 14.0, *) {
        authStatus = CLLocationManager().authorizationStatus
      } else {
        authStatus = CLLocationManager.authorizationStatus()
      }

      if authStatus == .denied || authStatus == .restricted {
        self.resolved = true
        reject("LOCATION_PERMISSION_DENIED", "Location permission is required.", nil)
        return
      }

      let manager = CLLocationManager()
      manager.delegate = self
      manager.desiredAccuracy = kCLLocationAccuracyBest
      self.locationManager = manager

      if authStatus == .notDetermined {
        manager.requestWhenInUseAuthorization()
      } else {
        self.startLocating()
      }
    }
  }

  private func startLocating() {
    guard let manager = locationManager else { return }

    // Try last known location first
    if let lastLocation = manager.location,
       Date().timeIntervalSince(lastLocation.timestamp) < 300 {
      deliverLocation(lastLocation)
      return
    }

    manager.startUpdatingLocation()

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
    guard manager === locationManager, let location = locations.last else { return }
    deliverLocation(location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard manager === locationManager, !resolved else { return }
    resolved = true
    timeoutTimer?.invalidate()
    locationManager?.stopUpdatingLocation()
    reject?("LOCATION_ERROR", error.localizedDescription, error)
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard manager === locationManager else { return }

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
