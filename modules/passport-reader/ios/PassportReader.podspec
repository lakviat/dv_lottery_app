Pod::Spec.new do |s|
  s.name = 'PassportReader'
  s.version = '1.0.0'
  s.summary = 'On-device passport text recognition for DV Lottery Tracker'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'DV Lottery Tracker'
  s.homepage = 'https://github.com/lakviat/dv_lottery_app'
  s.source = { :git => 'https://github.com/lakviat/dv_lottery_app.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO'
  s.source_files = '**/*.swift'
end
