require 'xcodeproj'

root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.new(File.join(root, 'DVLottery.xcodeproj'))
project.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0' }
app = project.new_target(:application, 'DVLottery', :ios, '17.0')
group = project.main_group.new_group('DVLottery', 'DVLottery')
Dir.glob(File.join(root, 'DVLottery', '**', '*.swift')).sort.each do |path|
  ref = group.new_file(path.delete_prefix(File.join(root, 'DVLottery') + '/'))
  app.source_build_phase.add_file_reference(ref)
end
assets = group.new_file('Assets.xcassets')
app.resources_build_phase.add_file_reference(assets)
privacy = group.new_file('PrivacyInfo.xcprivacy')
app.resources_build_phase.add_file_reference(privacy)
launch = group.new_file('LaunchScreen.storyboard')
app.resources_build_phase.add_file_reference(launch)
group.new_file('Info.plist')

app.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.dvlottery.app',
    'PRODUCT_NAME' => 'DVLottery',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'INFOPLIST_FILE' => 'DVLottery/Info.plist',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME' => 'AccentColor',
    'MARKETING_VERSION' => '0.1.0',
    'CURRENT_PROJECT_VERSION' => '1',
    'CODE_SIGN_STYLE' => 'Automatic',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'SUPPORTED_PLATFORMS' => 'iphoneos iphonesimulator',
    'SUPPORTS_MACCATALYST' => 'NO',
    'SWIFT_EMIT_LOC_STRINGS' => 'YES',
    'ENABLE_USER_SCRIPT_SANDBOXING' => 'YES'
  })
end

tests = project.new_target(:unit_test_bundle, 'DVLotteryTests', :ios, '17.0')
tests.add_dependency(app)
test_group = project.main_group.new_group('DVLotteryTests', 'DVLotteryTests')
Dir.glob(File.join(root, 'DVLotteryTests', '*.swift')).sort.each { |p| tests.source_build_phase.add_file_reference(test_group.new_file(File.basename(p))) }
tests.build_configurations.each do |c|
  c.build_settings.merge!({ 'PRODUCT_BUNDLE_IDENTIFIER' => 'com.dvlottery.tests', 'SWIFT_VERSION' => '5.0', 'GENERATE_INFOPLIST_FILE' => 'YES', 'TEST_HOST' => '$(BUILT_PRODUCTS_DIR)/DVLottery.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/DVLottery', 'BUNDLE_LOADER' => '$(TEST_HOST)', 'TARGETED_DEVICE_FAMILY' => '1,2' })
end

ui = project.new_target(:ui_test_bundle, 'DVLotteryUITests', :ios, '17.0')
ui.add_dependency(app)
ui_group = project.main_group.new_group('DVLotteryUITests', 'DVLotteryUITests')
Dir.glob(File.join(root, 'DVLotteryUITests', '*.swift')).sort.each { |p| ui.source_build_phase.add_file_reference(ui_group.new_file(File.basename(p))) }
ui.build_configurations.each do |c|
  c.build_settings.merge!({ 'PRODUCT_BUNDLE_IDENTIFIER' => 'com.dvlottery.uitests', 'SWIFT_VERSION' => '5.0', 'GENERATE_INFOPLIST_FILE' => 'YES', 'TEST_TARGET_NAME' => 'DVLottery', 'TARGETED_DEVICE_FAMILY' => '1,2' })
end

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.add_test_target(tests)
scheme.add_test_target(ui)
scheme.save_as(File.join(root, 'DVLottery.xcodeproj'), 'DVLottery', true)
project.save
puts 'Generated DVLottery.xcodeproj'
