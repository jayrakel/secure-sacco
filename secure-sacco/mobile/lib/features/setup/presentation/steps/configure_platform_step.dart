import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/setup_controller.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class ConfigurePlatformStep extends ConsumerStatefulWidget {
  const ConfigurePlatformStep({super.key});

  @override
  ConsumerState<ConfigurePlatformStep> createState() => _ConfigurePlatformStepState();
}

class _ConfigurePlatformStepState extends ConsumerState<ConfigurePlatformStep> {
  final _saccoNameController = TextEditingController();
  final _prefixController = TextEditingController();
  final _padLengthController = TextEditingController(text: '4');
  final _regFeeController = TextEditingController(text: '1000');
  
  bool _membersEnabled = true;
  bool _loansEnabled = true;
  bool _savingsEnabled = true;
  bool _reportsEnabled = true;

  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _saccoNameController.dispose();
    _prefixController.dispose();
    _padLengthController.dispose();
    _regFeeController.dispose();
    super.dispose();
  }

  void _onNameChanged(String val) {
    if (val.trim().length >= 3) {
      setState(() {
        _prefixController.text = val.replaceAll(RegExp(r'[^a-zA-Z]'), '').substring(0, 3).toUpperCase();
      });
    }
  }

  Future<void> _submit() async {
    final name = _saccoNameController.text.trim();
    final prefix = _prefixController.text.trim();
    final padStr = _padLengthController.text.trim();
    final feeStr = _regFeeController.text.trim();

    if (name.isEmpty || prefix.isEmpty || padStr.isEmpty || feeStr.isEmpty) {
      setState(() => _error = 'Please fill in all basic settings.');
      return;
    }

    final padLength = int.tryParse(padStr);
    final regFee = double.tryParse(feeStr);

    if (padLength == null || padLength < 3 || padLength > 8) {
      setState(() => _error = 'Padding must be between 3 and 8.');
      return;
    }
    if (regFee == null || regFee < 0) {
      setState(() => _error = 'Registration fee cannot be negative.');
      return;
    }

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      await ref.read(setupControllerProvider.notifier).savePlatformConfig(
        saccoName: name,
        prefix: prefix,
        padLength: padLength,
        registrationFee: regFee,
        flags: {
          'members': _membersEnabled,
          'loans': _loansEnabled,
          'savings': _savingsEnabled,
          'reports': _reportsEnabled,
        },
      );
    } catch (e) {
      setState(() => _error = 'Failed to configure platform: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Configure Platform', style: AppTextStyles.h3),
        const SizedBox(height: 8),
        const Text(
          'Set up your core SACCO parameters and enable features.',
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

        AppTextField(
          controller: _saccoNameController,
          label: 'SACCO Name *',
          onChanged: _onNameChanged,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: AppTextField(
                controller: _prefixController,
                label: 'Member No. Prefix *',
                hintText: 'e.g. SEC',
                maxLength: 5,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: AppTextField(
                controller: _padLengthController,
                label: 'Padding Length *',
                hintText: 'e.g. 4 (0001)',
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        AppTextField(
          controller: _regFeeController,
          label: 'Default Registration Fee (KES) *',
          keyboardType: TextInputType.number,
        ),

        const SizedBox(height: 32),
        const Text('Active Modules', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 16),
        
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Member Management', style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('Core member registration and profiles'),
                value: _membersEnabled,
                onChanged: (v) => setState(() => _membersEnabled = v),
                activeColor: AppColors.primary,
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text('Loans Module', style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('Loan products, applications, and tracking'),
                value: _loansEnabled,
                onChanged: (v) => setState(() => _loansEnabled = v),
                activeColor: AppColors.primary,
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text('Savings Module', style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('Savings products and deposits'),
                value: _savingsEnabled,
                onChanged: (v) => setState(() => _savingsEnabled = v),
                activeColor: AppColors.primary,
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text('Reporting & Analytics', style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('System-wide reports and metrics'),
                value: _reportsEnabled,
                onChanged: (v) => setState(() => _reportsEnabled = v),
                activeColor: AppColors.primary,
              ),
            ],
          ),
        ),

        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            AppButton(
              text: 'Complete Setup',
              icon: Icons.check_circle,
              onPressed: _loading ? null : _submit,
              isLoading: _loading,
            ),
          ],
        ),
      ],
    );
  }
}
