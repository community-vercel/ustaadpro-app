import Foundation
import AVFoundation
import AudioToolbox

@objc(ConfirmationSound)
class ConfirmationSoundModule: NSObject {
  
  var audioPlayer: AVAudioPlayer?
  
  @objc
  func play() {
    // Play vibration pattern
    let pattern: [Double] = [0.045, 0.045, 0.070]
    playVibrationPattern(pattern)
    
    // Play confirmation sound from bundle
    DispatchQueue.main.async {
      guard let soundURL = Bundle.main.url(forResource: "order_confirm", withExtension: "mp3")
              ?? Bundle.main.url(forResource: "order_confirm", withExtension: "wav")
              ?? Bundle.main.url(forResource: "order_confirm", withExtension: "aif") else {
        // If sound file not found, just play a system sound
        AudioServicesPlaySystemSound(1016)
        return
      }
      do {
        self.audioPlayer = try AVAudioPlayer(contentsOf: soundURL)
        self.audioPlayer?.play()
      } catch {
        print("ConfirmationSound: Could not play sound - \(error.localizedDescription)")
        AudioServicesPlaySystemSound(1016)
      }
    }
  }
  
  private func playVibrationPattern(_ delays: [Double]) {
    var cumulativeDelay: Double = 0
    for (index, delay) in delays.enumerated() {
      cumulativeDelay += delay
      DispatchQueue.main.asyncAfter(deadline: .now() + cumulativeDelay) {
        if index % 2 == 0 {
          AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        }
      }
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
