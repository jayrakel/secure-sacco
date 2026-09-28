import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_state.dart';
import '../data/auth_repository.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

/// Contact verification screen.
///
/// Shown automatically when [AuthStatus.requiresContactVerification] is active.
///
/// - **Email**: The backend sends a magic-link to the user's email. The user
///   opens the link in their browser/email client; the link points back to the
///   app's `/auth/verify-contact` route with `?type=email&token=<uuid>`.
///   If [emailToken] is provided (deep-linked), the screen auto-confirms.
///
/// - **Phone**: The backend sends a 6-digit OTP via SMS. The user enters it
///   here and the screen calls `/api/v1/auth/verify/phone/confirm`.
class ContactVerificationScreen extends ConsumerStatefulWidget {
  /// Pre-filled email token from the verification deep-link.
  final String? emailToken;

  const ContactVerificationScreen({super.key, this.emailToken});

  @override
  ConsumerState<ContactVerificationScreen> createState() =>
      _ContactVerificationScreenState();
}

class _ContactVerificationScreenState
    extends ConsumerState<ContactVerificationScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _phoneOtpController = TextEditingController();

  // Email tab state
  bool _emailSending = false;
  bool _emailLinkSent = false;
  bool _emailConfirming = false;
  String? _emailError;
  String? _emailSuccess;

  // Phone tab state
  bool _phoneSending = false;
  bool _phoneOtpSent = false;
  bool _phoneConfirming = false;
  String? _phoneError;
  String? _phoneSuccess;

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  void initState() {
    super.initState();
    final authState = ref.read(authControllerProvider);
    final needsEmail = !authState.emailVerified;
    final needsPhone = !authState.phoneVerified;

    // Start on the first tab that needs verification
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: needsEmail ? 0 : 1,
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      // If we arrived via deep-link with an email token, auto-confirm
      if (widget.emailToken != null) {
        _confirmEmail(widget.emailToken!);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneOtpController.dispose();
    super.dispose();
  }

  // ── Email actions ─────────────────────────────────────────────────────────

  Future<void> _sendEmailLink() async {
    setState(() {
      _emailSending = true;
      _emailError = null;
    });
    try {
      await _repo.sendEmailVerification();
      if (mounted) {
        setState(() {
          _emailLinkSent = true;
          _emailSending = false;
          _emailSuccess = 'Verification link sent! Check your email inbox and click the link.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _emailSending = false;
        _emailError = _friendlyError(e, 'Could not send verification email.');
      });
    }
  }

  Future<void> _confirmEmail(String token) async {
    setState(() {
      _emailConfirming = true;
      _emailError = null;
    });
    try {
      await _repo.confirmEmail(token);
      if (!mounted) return;
      setState(() {
        _emailConfirming = false;
        _emailSuccess = 'Email verified! ✓';
      });
      // Refresh session — router will redirect to dashboard when both verified
      await ref.read(authControllerProvider.notifier).refreshAfterVerification();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _emailConfirming = false;
        _emailError = _friendlyError(e, 'Email verification failed. The link may have expired.');
      });
    }
  }

  // ── Phone actions ─────────────────────────────────────────────────────────

  Future<void> _sendPhoneOtp() async {
    setState(() {
      _phoneSending = true;
      _phoneError = null;
    });
    try {
      await _repo.sendPhoneOtp();
      if (mounted) {
        setState(() {
          _phoneOtpSent = true;
          _phoneSending = false;
          _phoneSuccess = 'OTP sent to your registered phone number.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phoneSending = false;
        _phoneError = _friendlyError(e, 'Could not send OTP.');
      });
    }
  }

  Future<void> _confirmPhone() async {
    final otp = _phoneOtpController.text.trim();
    if (otp.isEmpty) {
      setState(() => _phoneError = 'Please enter the OTP code.');
      return;
    }
    setState(() {
      _phoneConfirming = true;
      _phoneError = null;
    });
    try {
      await _repo.confirmPhone(otp);
      if (!mounted) return;
      setState(() {
        _phoneConfirming = false;
        _phoneSuccess = 'Phone verified! ✓';
      });
      await ref.read(authControllerProvider.notifier).refreshAfterVerification();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phoneConfirming = false;
        _phoneError = _friendlyError(e, 'Incorrect or expired OTP.');
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  String _friendlyError(Object e, String fallback) {
    final msg = e.toString();
    if (msg.contains('Too many requests')) {
      return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (msg.contains('expired')) return 'The code has expired. Please request a new one.';
    if (msg.contains('Incorrect') || msg.contains('Invalid')) {
      return 'Incorrect code. Please check and try again.';
    }
    if (msg.contains('500') || msg.contains('Internal')) return fallback;
    return msg.length > 120 ? fallback : msg;
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final needsEmail = !authState.emailVerified;
    final needsPhone = !authState.phoneVerified;
    final user = authState.user;
    final email = user?['email'] as String? ?? '';
    final phone = user?['phoneNumber'] as String? ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.md),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(25),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.verified_user_outlined,
                      size: 48,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Verify Your Contact',
                    style: AppTextStyles.h1.copyWith(color: AppColors.primaryDark),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Please verify your contact details to access the system.',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),

            // Tab bar
            TabBar(
              controller: _tabController,
              tabs: [
                Tab(
                  icon: Icon(
                    Icons.email_outlined,
                    color: needsEmail ? AppColors.warning : AppColors.positive,
                  ),
                  text: needsEmail ? 'Email (Unverified)' : 'Email ✓',
                ),
                Tab(
                  icon: Icon(
                    Icons.phone_outlined,
                    color: needsPhone ? AppColors.warning : AppColors.positive,
                  ),
                  text: needsPhone ? 'Phone (Unverified)' : 'Phone ✓',
                ),
              ],
            ),

            // Tab views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // ── Email tab ──────────────────────────────────────────────
                  _buildEmailTab(email, needsEmail),

                  // ── Phone tab ──────────────────────────────────────────────
                  _buildPhoneTab(phone, needsPhone),
                ],
              ),
            ),

            // Sign out
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: TextButton(
                onPressed: () =>
                    ref.read(authControllerProvider.notifier).logout(),
                child: Text(
                  'Sign out',
                  style:
                      AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmailTab(String email, bool needsVerification) {
    if (!needsVerification) {
      return _buildVerifiedPlaceholder('Email', Icons.email_outlined);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ContactInfoTile(icon: Icons.email_outlined, label: 'Email', value: email),
          const SizedBox(height: AppSpacing.lg),

          if (_emailError != null) _Alert(message: _emailError!, isError: true),
          if (_emailSuccess != null) _Alert(message: _emailSuccess!, isError: false),

          if (_emailConfirming) ...[
            const SizedBox(height: AppSpacing.md),
            const Center(child: CircularProgressIndicator()),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: Text('Confirming your email…',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary)),
            ),
          ] else if (!_emailLinkSent) ...[
            Text(
              'We will send a verification link to your email address. '
              'Click the link in the email to confirm.',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              icon: _emailSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white)),
                    )
                  : const Icon(Icons.send),
              label: const Text('Send Verification Email'),
              onPressed: _emailSending ? null : _sendEmailLink,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(AppSpacing.borderRadiusSm),
                ),
              ),
            ),
          ] else ...[
            // Link sent — waiting for user to click it
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(15),
                borderRadius:
                    BorderRadius.circular(AppSpacing.borderRadiusMd),
                border: Border.all(color: AppColors.primary.withAlpha(50)),
              ),
              child: Column(
                children: [
                  const Icon(Icons.mark_email_read_outlined,
                      color: AppColors.primary, size: 40),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Check your inbox',
                    style: AppTextStyles.h3
                        .copyWith(color: AppColors.primaryDark),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'We sent a link to $email. '
                    'Open the email and tap the verification link. '
                    'The app will update automatically.',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextButton(
              onPressed: _emailSending ? null : _sendEmailLink,
              child: const Text('Resend Link'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPhoneTab(String phone, bool needsVerification) {
    if (!needsVerification) {
      return _buildVerifiedPlaceholder('Phone', Icons.phone_outlined);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ContactInfoTile(icon: Icons.phone_outlined, label: 'Phone', value: phone),
          const SizedBox(height: AppSpacing.lg),

          if (_phoneError != null) _Alert(message: _phoneError!, isError: true),
          if (_phoneSuccess != null) _Alert(message: _phoneSuccess!, isError: false),

          if (!_phoneOtpSent) ...[
            Text(
              'We will send a 6-digit OTP to your registered phone number.',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              icon: _phoneSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white)),
                    )
                  : const Icon(Icons.sms_outlined),
              label: const Text('Send OTP'),
              onPressed: _phoneSending ? null : _sendPhoneOtp,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(AppSpacing.borderRadiusSm),
                ),
              ),
            ),
          ] else ...[
            TextField(
              controller: _phoneOtpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(
                labelText: '6-digit OTP',
                prefixIcon: Icon(Icons.lock_outline),
                hintText: 'Enter the code sent via SMS',
                counterText: '',
              ),
              textAlign: TextAlign.center,
              style: AppTextStyles.h2,
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton(
              onPressed: _phoneConfirming ? null : _confirmPhone,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(AppSpacing.borderRadiusSm),
                ),
              ),
              child: _phoneConfirming
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white)),
                    )
                  : const Text('Verify Phone', style: AppTextStyles.buttonLarge),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton.icon(
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Resend OTP'),
              onPressed: _phoneSending ? null : _sendPhoneOtp,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVerifiedPlaceholder(String label, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.positive, size: 48),
          const SizedBox(height: AppSpacing.md),
          Text(
            '$label is verified ✓',
            style: AppTextStyles.h3.copyWith(color: AppColors.positive),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'No action needed for this contact.',
            style: AppTextStyles.bodyMedium
                .copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ── Small widgets ────────────────────────────────────────────────────────────

class _ContactInfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ContactInfoTile(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.warning.withAlpha(20),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
        border: Border.all(color: AppColors.warning.withAlpha(80)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.warning, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: AppTextStyles.bodySmall
                      .copyWith(color: AppColors.textSecondary)),
              Text(value, style: AppTextStyles.bodyMedium),
            ],
          ),
          const Spacer(),
          const Icon(Icons.cancel, color: AppColors.warning, size: 18),
        ],
      ),
    );
  }
}

class _Alert extends StatelessWidget {
  final String message;
  final bool isError;

  const _Alert({required this.message, required this.isError});

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppColors.negative : AppColors.positive;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusSm),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Row(
        children: [
          Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: color,
              size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
              child: Text(message,
                  style: AppTextStyles.bodyMedium.copyWith(color: color))),
        ],
      ),
    );
  }
}
