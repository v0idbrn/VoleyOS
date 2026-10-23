# Keep creator unlock verifier and sensitive cryptography hooks
-keep class org.voleyos.global.creator.** { *; }

# Keep bridge callbacks kept for verification
-keep class org.voleyos.global.bridge.** { *; }

# Keep gym score handler
-keep class org.voleyos.global.gym.** { *; }
