import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';


import '../data/profile_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/authenticated_avatar.dart';
import '../../auth/data/auth_state.dart';
import 'change_password_screen.dart';
import 'session_list_screen.dart';
import 'security_settings_screen.dart';
import '../../settings/presentation/notification_settings_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(profileControllerProvider.notifier).fetchProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(profileControllerProvider);

    return DefaultTabController(
      length: 6,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('My Profile'),
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppColors.textPrimary),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout, color: AppColors.negative),
              tooltip: 'Logout',
              onPressed: () {
                ref.read(authControllerProvider.notifier).logout();
              },
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Personal Info'),
              Tab(text: 'Contact'),
              Tab(text: 'Password'),
              Tab(text: 'Two-Factor'),
              Tab(text: 'Devices'),
              Tab(text: 'Notifications'),
            ],
          ),
        ),
        body: state.isLoading && state.profile == null
            ? const Center(child: CircularProgressIndicator())
            : state.error != null && state.profile == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.negative),
                        const SizedBox(height: AppSpacing.sm),
                        Text(state.error!, style: AppTextStyles.bodyMedium),
                        const SizedBox(height: AppSpacing.md),
                        ElevatedButton(
                          onPressed: () {
                            ref.read(profileControllerProvider.notifier).fetchProfile();
                          },
                          child: const Text('Retry'),
                        )
                      ],
                    ),
                  )
                : TabBarView(
                    children: [
                      _PersonalInfoTab(profileData: state.profile),
                      _ContactTab(profileData: state.profile),
                      const ChangePasswordScreen(embedded: true),
                      const SecuritySettingsScreen(embedded: true),
                      const SessionListScreen(embedded: true),
                      const NotificationSettingsScreen(embedded: true),
                    ],
                  ),
      ),
    );
  }
}

class _PersonalInfoTab extends ConsumerStatefulWidget {
  final Map<String, dynamic>? profileData;
  const _PersonalInfoTab({required this.profileData});

  @override
  ConsumerState<_PersonalInfoTab> createState() => _PersonalInfoTabState();
}

class _PersonalInfoTabState extends ConsumerState<_PersonalInfoTab> {
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: widget.profileData?['firstName'] ?? '');
    _lastNameController = TextEditingController(text: widget.profileData?['lastName'] ?? '');
  }

  @override
  void didUpdateWidget(covariant _PersonalInfoTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.profileData != oldWidget.profileData) {
      if (_firstNameController.text.isEmpty && _lastNameController.text.isEmpty) {
        _firstNameController.text = widget.profileData?['firstName'] ?? '';
        _lastNameController.text = widget.profileData?['lastName'] ?? '';
      }
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    try {
      await ref.read(profileControllerProvider.notifier).updateProfile(
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            phoneNumber: widget.profileData?['phoneNumber'],
          );
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully!', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.positive));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update profile.', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.negative));
    }
  }

  Future<void> _pickImage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
    );
    
    if (image != null) {
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: image.path,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Photo',
            toolbarColor: AppColors.primary,
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
          ),
          IOSUiSettings(
            title: 'Crop Photo',
            aspectRatioLockEnabled: true,
          ),
        ],
      );

      if (croppedFile != null) {
        try {
          await ref.read(profileControllerProvider.notifier).uploadPhoto(File(croppedFile.path));
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile photo updated successfully!', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.positive));
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update profile photo.', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.negative));
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profileData;
    final state = ref.watch(profileControllerProvider);
    final String initial = _firstNameController.text.isNotEmpty ? _firstNameController.text[0].toUpperCase() : '?';
    // Append timestamp to URL to bypass cache (simple method)
    final photoUrl = profile?['profilePhotoUrl'] != null ? '${profile!['profilePhotoUrl']}?t=${DateTime.now().millisecondsSinceEpoch}' : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [


          Center(
            child: GestureDetector(
              onTap: _pickImage,
              child: Stack(
                alignment: Alignment.bottomRight,
                children: [
                  AuthenticatedAvatar(
                    radius: 50,
                    imageUrl: photoUrl,
                    fallbackText: initial,
                    backgroundColor: AppColors.primaryLight,
                    textColor: AppColors.primary,
                  ),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.camera_alt,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          const Text('First Name', style: AppTextStyles.bodySmall),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _firstNameController,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          const Text('Last Name', style: AppTextStyles.bodySmall),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _lastNameController,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: state.isLoading ? null : _saveChanges,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppColors.primary,
              ),
              child: state.isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Save Changes', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactTab extends ConsumerStatefulWidget {
  final Map<String, dynamic>? profileData;
  const _ContactTab({required this.profileData});

  @override
  ConsumerState<_ContactTab> createState() => _ContactTabState();
}

class _ContactTabState extends ConsumerState<_ContactTab> {
  late TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.profileData?['phoneNumber'] ?? '');
  }

  @override
  void didUpdateWidget(covariant _ContactTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.profileData != oldWidget.profileData) {
       if (_phoneController.text.isEmpty) {
         _phoneController.text = widget.profileData?['phoneNumber'] ?? '';
       }
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    try {
      await ref.read(profileControllerProvider.notifier).updateProfile(
            firstName: widget.profileData?['firstName'] ?? '',
            lastName: widget.profileData?['lastName'] ?? '',
            phoneNumber: _phoneController.text.trim(),
          );
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone number updated successfully!', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.positive));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update phone number.', style: TextStyle(color: Colors.white)), backgroundColor: AppColors.negative));
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profileData;
    final state = ref.watch(profileControllerProvider);
    final bool isEmailVerified = profile?['emailVerified'] == true;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Login Email', style: AppTextStyles.bodySmall),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: TextEditingController(text: profile?['email'] ?? ''),
            enabled: false,
            style: const TextStyle(color: AppColors.textSecondary),
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              suffixIcon: Icon(
                isEmailVerified ? Icons.check_circle : Icons.warning,
                color: isEmailVerified ? AppColors.positive : AppColors.warning,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          const Text('Email changes must be requested through your System Administrator.', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          
          const SizedBox(height: AppSpacing.xl),
          const Text('Phone Number', style: AppTextStyles.bodySmall),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: _phoneController,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            ),
            keyboardType: TextInputType.phone,
          ),
          
          const SizedBox(height: AppSpacing.xl),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: state.isLoading ? null : _saveChanges,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppColors.primary,
              ),
              child: state.isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Update Phone Number', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

