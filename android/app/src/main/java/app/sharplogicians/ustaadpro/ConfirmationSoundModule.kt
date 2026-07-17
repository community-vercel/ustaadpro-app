package app.sharplogicians.ustaadpro

import android.media.AudioManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ConfirmationSoundModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ConfirmationSound"

  @ReactMethod
  fun play() {
    try {
      val mediaPlayer = android.media.MediaPlayer.create(reactContext, R.raw.order_confirm)
      mediaPlayer?.setOnCompletionListener { mp ->
        mp.release()
      }
      mediaPlayer?.start()
    } catch (e: Exception) {
      e.printStackTrace()
    }

    val vibrator =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          val manager =
              reactContext.getSystemService(VibratorManager::class.java)
          manager.defaultVibrator
        } else {
          @Suppress("DEPRECATION")
          reactContext.getSystemService(Vibrator::class.java)
        }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(
          VibrationEffect.createWaveform(longArrayOf(0, 45, 45, 70), -1),
      )
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(longArrayOf(0, 45, 45, 70), -1)
    }
  }
}
