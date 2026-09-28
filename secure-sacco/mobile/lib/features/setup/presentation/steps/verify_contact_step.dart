import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/data/auth_state.dart';
import '../../data/setup_controller.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class VerifyContactStep extends ConsumerStatefulWidget {
  const VerifyContactStep({super.key});

  @override
  ConsumerState<VerifyContactStep> createState() => _VerifyContactStepState();
}

class _VerifyContactStepState extends ConsumerState<VerifyContactStep> {
  bool _emailSent = false;
  final _tokenController = TextEditingController();
  bool _loading = false;
  String _error = '';
  String _successMsg = '';

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _sendEmail() async {
    setState(() {
      _loading = true;
      _error = '';
      _successMsg = '';
    });
    try {
      await ref.read(setupControllerProvider.notifier).sendEmailVerification();
      setState(() {
        _emailSent = true;
        _successMsg = 'Verification email sent — check your inbox.';
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to send email. $e';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _confirmEmail() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) return;

    setState(() {
      _loading = true;
      _error = '';
      _successMsg = '';
    });
    try {
      await ref.read(setupControllerProvider.notifier).confirmEmail(token);
      await ref.read(authControllerProvider.notifier).checkSession();
      setState(() {
        _successMsg = 'Email verified ✓';
      });
    } catch (e) {
      setState(() {
        _error = 'Invalid or expired token. $e';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final emailDone = user?['emailVerified'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Verify Your Identity',
          style: AppTextStyles.h3,
        ),
        const SizedBox(height: 8),
        const Text(
          'Confirm your email address before proceeding.',
          style: AppTextStyles.bodyMedium,
        ),
        const SizedBox(height: 24),

        if (_error.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.negative.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.negative.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: AppColors.negative, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_error, style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative))),
              ],
            ),
          ),

        if (_successMsg.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.positive.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.positive.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.positive, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_successMsg, style: AppTextStyles.bodySmall.copyWith(color: AppColors.positive))),
              ],
            ),
          ),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: emailDone ? AppColors.positive.withOpacity(0.05) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: emailDone ? AppColors.positive.withOpacity(0.3) : AppColors.border, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.email, color: emailDone ? AppColors.positive : Colors.grey, size: 20),
                      const SizedBox(width: 8),
                      const Text('Email Address', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(user?['email'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                      ),
                    ],
                  ),
                  if (emailDone)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.positive.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Verified ✓', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.positive)),
                    ),
                ],
              ),
              if (!emailDone) ...[
                const SizedBox(height: 16),
                if (!_emailSent)
                  AppButton(
                    text: 'Send Verification Email',
                    onPressed: _loading ? null : _sendEmail,
                    isLoading: _loading,
                    icon: Icons.send,
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          controller: _tokenController,
                          hintText: 'Paste the token from your email...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                      const SizedBox(width: 8),
                      AppButton(
                        text: 'Confirm',
                        onPressed: _loading ? null : _confirmEmail,
                        isLoading: _loading,
                      ),
                    ],
                  ),
                if (_emailSent)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: TextButton.icon(
                      onPressed: _loading ? null : _sendEmail,
                      icon: const Icon(Icons.refresh, size: 14),
                      label: const Text('Resend email', style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.grey.shade600,
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.phone, color: Colors.grey.shade400, size: 20),
                  const SizedBox(width: 8),
                  const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Coming soon', style: TextStyle(fontSize: 12, color: Colors.black54)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text('SMS verification will be enabled once Africa\'s Talking is integrated.', style: TextStyle(fontSize: 12, color: Colors.black54)),
            ],
          ),
        ),

        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            AppButton(
              text: 'Continue',
              icon: Icons.arrow_forward,
              onPressed: emailDone ? () => ref.read(setupControllerProvider.notifier).refresh() : null,
            ),
          ],
        ),
      ],
    );
  }
}
