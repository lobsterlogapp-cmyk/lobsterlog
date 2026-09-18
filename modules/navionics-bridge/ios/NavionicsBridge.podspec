Pod::Spec.new do |s|
  s.name           = 'NavionicsBridge'
  s.version        = '0.1.0'
  s.summary        = 'Navionics chart bridge — Android does the work, iOS is a stub.'
  s.description    = 'Local Expo module. On iOS every function reports that charts are unavailable; Garmin\'s iOS extension crashes at launch, so nothing is linked here.'
  s.license        = 'UNLICENSED'
  s.author         = 'LobsterLog'
  s.homepage       = 'https://lobsterlog.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
