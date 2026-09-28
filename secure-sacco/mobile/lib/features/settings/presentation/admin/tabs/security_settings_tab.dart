import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class SecuritySettingsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const SecuritySettingsTab({super.key, required this.settings});

  @override
  ConsumerState<SecuritySettingsTab> createState() => _SecuritySettingsTabState();
}

class _SecuritySettingsTabState extends ConsumerState<SecuritySettingsTab> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _maxLoginAttempts;
  late TextEditingController _lockoutDuration;
  late TextEditingController _sessionTimeout;
  late TextEditingController _pwdResetExpiry;
  late TextEditingController _mfaTokenExpiry;
  late TextEditingController _emailVerifyExpiry;
  late TextEditingController _minPwdLength;
  late TextEditingController _contactRateLimit;
  late TextEditingController _contactVerifyWindow;
  late TextEditingController _generalRateLimit;

  @override
  void initState() {
    super.initState();
    _maxLoginAttempts = TextEditingController(text: widget.settings.maxLoginAttempts?.toString() ?? '5');
    _lockoutDuration = TextEditingController(text: widget.settings.lockoutDurationMinutes?.toString() ?? '15');
    _sessionTimeout = TextEditingController(text: widget.settings.sessionTimeoutMinutes?.toString() ?? '30');
    _pwdResetExpiry = TextEditingController(text: widget.settings.passwordResetExpiryMin?.toString() ?? '15');
    _mfaTokenExpiry = TextEditingController(text: widget.settings.mfaTokenExpiryMinutes?.toString() ?? '5');
    _emailVerifyExpiry = TextEditingController(text: widget.settings.emailVerifyExpiryHours?.toString() ?? '24');
    _minPwdLength = TextEditingController(text: widget.settings.minPasswordLength?.toString() ?? '8');
    _contactRateLimit = TextEditingController(text: widget.settings.contactVerifyRateLimit?.toString() ?? '3');
    _contactVerifyWindow = TextEditingController(text: widget.settings.contactVerifyWindowMin?.toString() ?? '60');
    _generalRateLimit = TextEditingController(text: widget.settings.rateLimitGeneralPerMin?.toString() ?? '60');
  }

  @override
  void dispose() {
    _maxLoginAttempts.dispose();
    _lockoutDuration.dispose();
    _sessionTimeout.dispose();
    _pwdResetExpiry.dispose();
    _mfaTokenExpiry.dispose();
    _emailVerifyExpiry.dispose();
    _minPwdLength.dispose();
    _contactRateLimit.dispose();
    _contactVerifyWindow.dispose();
    _generalRateLimit.dispose();
    super.dispose();
  }

  void _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    final request = UpdateSecurityPolicyRequest(
      maxLoginAttempts: int.parse(_maxLoginAttempts.text),
      lockoutDurationMinutes: int.parse(_lockoutDuration.text),
      sessionTimeoutMinutes: int.parse(_sessionTimeout.text),
      passwordResetExpiryMin: int.parse(_pwdResetExpiry.text),
      mfaTokenExpiryMinutes: int.parse(_mfaTokenExpiry.text),
      emailVerifyExpiryHours: int.parse(_emailVerifyExpiry.text),
      minPasswordLength: int.parse(_minPwdLength.text),
      contactVerifyRateLimit: int.parse(_contactRateLimit.text),
      contactVerifyWindowMin: int.parse(_contactVerifyWindow.text),
      rateLimitGeneralPerMin: int.parse(_generalRateLimit.text),
    );

    await ref.read(settingsNotifierProvider.notifier).updateSecurityPolicy(request);
    
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Security policy updated successfully'), backgroundColor: AppColors.positive));
    }
  }

  Widget _buildField(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: TextFormField(
        controller: controller,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
        keyboardType: TextInputType.number,
        validator: (val) => val == null || int.tryParse(val) == null ? 'Required number' : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsNotifierProvider);
    final isLoading = state.isLoading;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Authentication & Sessions', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            _buildField('Max Login Attempts', _maxLoginAttempts),
            _buildField('Lockout Duration (mins)', _lockoutDuration),
            _buildField('Session Timeout (mins)', _sessionTimeout),
            _buildField('Minimum Password Length', _minPwdLength),
            const SizedBox(height: 16),
            const Text('Tokens & Expiry', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            _buildField('Password Reset Expiry (mins)', _pwdResetExpiry),
            _buildField('MFA Token Expiry (mins)', _mfaTokenExpiry),
            _buildField('Email Verification Expiry (hours)', _emailVerifyExpiry),
            const SizedBox(height: 16),
            const Text('Rate Limits', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            _buildField('Contact Verify Rate Limit', _contactRateLimit),
            _buildField('Contact Verify Window (mins)', _contactVerifyWindow),
            _buildField('General Rate Limit (per min)', _generalRateLimit),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: isLoading ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Save Security Policy', style: TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
