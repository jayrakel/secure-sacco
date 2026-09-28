import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/profile_repository.dart';
import '../data/profile_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

class SecuritySettingsScreen extends ConsumerStatefulWidget {
  final bool embedded;
  const SecuritySettingsScreen({super.key, this.embedded = false});

  @override
  ConsumerState<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends ConsumerState<SecuritySettingsScreen> {
  bool _isLoading = false;
  String? _message;
  bool _isError = false;
  
  Map<String, dynamic>? _mfaSetupData;
  final _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }
  
  void _checkStatus() {
    final profile = ref.read(profileControllerProvider).profile;
    if (profile != null && profile['mfaEnabled'] == false) {
      _loadMfaSetup();
    }
  }

  Future<void> _loadMfaSetup() async {
    setState(() {
      _isLoading = true;
      _message = null;
    });
    try {
      final setupData = await ref.read(profileRepositoryProvider).getMfaSetup();
      setState(() {
        _mfaSetupData = setupData;
      });
    } catch (e) {
      setState(() {
        _message = "Failed to load MFA setup.";
        _isError = true;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _enableMfa() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      await ref.read(profileRepositoryProvider).enableMfa(code);
      await ref.read(profileControllerProvider.notifier).fetchProfile();
      setState(() {
        _message = "MFA successfully enabled.";
        _isError = false;
        _mfaSetupData = null;
      });
    } catch (e) {
      setState(() {
        _message = "Failed to enable MFA. Check your code.";
        _isError = true;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _disableMfa() async {
    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      await ref.read(profileRepositoryProvider).disableMfa();
      await ref.read(profileControllerProvider.notifier).fetchProfile();
      setState(() {
        _message = "MFA successfully disabled.";
        _isError = false;
      });
      _loadMfaSetup(); // Load setup since it's disabled now
    } catch (e) {
      setState(() {
        _message = "Failed to disable MFA.";
        _isError = true;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileState = ref.watch(profileControllerProvider);
    final isMfaEnabled = profileState.profile?['mfaEnabled'] == true;

    return Scaffold(
      backgroundColor: widget.embedded ? Colors.transparent : AppColors.background,
      appBar: widget.embedded ? null : AppBar(
        title: const Text('Security Settings'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_message != null)
                Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: _isError 
                        ? AppColors.negative.withAlpha((0.1 * 255).toInt())
                        : AppColors.positive.withAlpha((0.1 * 255).toInt()),
                    borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
                    border: Border.all(
                      color: _isError 
                          ? AppColors.negative.withAlpha((0.3 * 255).toInt())
                          : AppColors.positive.withAlpha((0.3 * 255).toInt())
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isError ? Icons.error_outline : Icons.check_circle_outline,
                        color: _isError ? AppColors.negative : AppColors.positive,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          _message!,
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: _isError ? AppColors.negative : AppColors.positive,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  Icons.security, 
                  color: isMfaEnabled ? AppColors.positive : AppColors.textSecondary,
                  size: 32,
                ),
                title: Text('Two-Factor Authentication', style: AppTextStyles.h3),
                subtitle: Text(
                  isMfaEnabled 
                      ? 'Your account is protected with MFA.' 
                      : 'Add an extra layer of security.',
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              if (isMfaEnabled)
                ElevatedButton(
                  onPressed: _isLoading ? null : _disableMfa,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.negative,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white))
                      : const Text('Disable MFA', style: TextStyle(color: Colors.white)),
                )
              else if (_mfaSetupData != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('1. Install an authenticator app (like Google Authenticator).', style: AppTextStyles.bodyMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Text('2. Enter this code into the app:', style: AppTextStyles.bodyMedium),
                    const SizedBox(height: AppSpacing.md),
                    
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              _mfaSetupData!['secret'] ?? '',
                              style: AppTextStyles.h3.copyWith(letterSpacing: 2),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _mfaSetupData!['secret']));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Copied to clipboard')),
                              );
                            },
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    
                    Text('3. Verify the setup with a code from the app:', style: AppTextStyles.bodyMedium),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: _codeController,
                      decoration: const InputDecoration(
                        labelText: '6-digit Code',
                        prefixIcon: Icon(Icons.password_outlined),
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _enableMfa,
                      style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                      child: _isLoading
                          ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white))
                          : const Text('Verify and Enable'),
                    )
                  ],
                )
              else
                const Center(child: CircularProgressIndicator()),
            ],
          ),
        ),
      ),
    );
  }
}
