package app.sharplogicians.ustaadpro

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CurrentLocationModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CurrentLocation"

  @ReactMethod
  fun getCurrentLocation(promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission is required.")
      return
    }

    val locationManager =
        reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val enabledProviders = getEnabledLocationProviders(locationManager)
    if (enabledProviders.isEmpty()) {
      promise.reject(
          "LOCATION_DISABLED",
          "Please turn on Location/GPS from your phone settings.",
      )
      return
    }

    val lastKnownLocation = getBestLastKnownLocation(locationManager)
    if (lastKnownLocation != null) {
      promise.resolve(locationToMap(lastKnownLocation))
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var resolved = false
    lateinit var listener: LocationListener

    listener =
        object : LocationListener {
          override fun onLocationChanged(location: Location) {
            if (resolved) return
            resolved = true
            locationManager.removeUpdates(listener)
            promise.resolve(locationToMap(location))
          }

          override fun onProviderDisabled(provider: String) = Unit
          override fun onProviderEnabled(provider: String) = Unit
          override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
        }

    handler.postDelayed(
        {
          if (!resolved) {
            resolved = true
            locationManager.removeUpdates(listener)
            promise.reject("LOCATION_TIMEOUT", "Could not find your location. Please try again.")
          }
        },
        20000,
    )

    try {
      enabledProviders.forEach { provider ->
        locationManager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
      }
    } catch (error: Exception) {
      if (!resolved) {
        resolved = true
        locationManager.removeUpdates(listener)
        promise.reject("LOCATION_ERROR", error.message ?: "Could not find your location.")
      }
    }
  }

  private fun hasLocationPermission(): Boolean {
    val fine =
        ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    val coarse =
        ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    return fine || coarse
  }

  private fun getBestLastKnownLocation(locationManager: LocationManager): Location? {
    val providers =
        listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER,
        )
    return providers
        .mapNotNull { provider ->
          try {
            locationManager.getLastKnownLocation(provider)
          } catch (_: SecurityException) {
            null
          } catch (_: IllegalArgumentException) {
            null
          }
        }
        .maxByOrNull { it.time }
  }

  private fun getEnabledLocationProviders(locationManager: LocationManager): List<String> =
      listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
          .filter { provider ->
            try {
              locationManager.isProviderEnabled(provider)
            } catch (_: Exception) {
              false
            }
          }

  private fun locationToMap(location: Location) =
      Arguments.createMap().apply {
        putDouble("latitude", location.latitude)
        putDouble("longitude", location.longitude)
      }
}
