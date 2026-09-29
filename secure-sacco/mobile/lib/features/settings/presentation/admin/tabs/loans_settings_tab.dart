import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class LoansSettingsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const LoansSettingsTab({super.key, required this.settings});

  @override
  ConsumerState<LoansSettingsTab> createState() => _LoansSettingsTabState();
}

class _LoansSettingsTabState extends ConsumerState<LoansSettingsTab> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _minSavingsController;
  late TextEditingController _minMembershipController;
  late TextEditingController _borrowingMultiplierController;
  late TextEditingController _maxCreditScoreController;
  late TextEditingController _minGuarantorsController;
  late TextEditingController _guarantorCapacityController;
  late TextEditingController _processingFeeController;
  bool _sharesCountBorrowing = false;
  bool _sharesCountGuarantor = false;

  @override
  void initState() {
    super.initState();
    _minSavingsController = TextEditingController(text: widget.settings.minSavingsToBorrow?.toString() ?? '5000');
    _minMembershipController = TextEditingController(text: widget.settings.minMembershipMonths?.toString() ?? '6');
    _borrowingMultiplierController = TextEditingController(text: widget.settings.borrowingMultiplier?.toString() ?? '3.0');
    _maxCreditScoreController = TextEditingController(text: widget.settings.maxCreditScoreMultiplier?.toString() ?? '1.0');
    _minGuarantorsController = TextEditingController(text: widget.settings.minGuarantorsCount?.toString() ?? '3');
    _guarantorCapacityController = TextEditingController(text: widget.settings.guarantorCapacityPct?.toString() ?? '50.0');
    _processingFeeController = TextEditingController(text: widget.settings.processingFee?.toString() ?? '0');
    _sharesCountBorrowing = widget.settings.sharesCountBorrowing ?? false;
    _sharesCountGuarantor = widget.settings.sharesCountGuarantor ?? false;
  }

  @override
  void dispose() {
    _minSavingsController.dispose();
    _minMembershipController.dispose();
    _borrowingMultiplierController.dispose();
    _maxCreditScoreController.dispose();
    _minGuarantorsController.dispose();
    _guarantorCapacityController.dispose();
    _processingFeeController.dispose();
    super.dispose();
  }

  void _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    final request = UpdateLoansRequest(
      minSavingsToBorrow: double.tryParse(_minSavingsController.text.trim()) ?? 5000.0,
      minMembershipMonths: int.tryParse(_minMembershipController.text.trim()) ?? 6,
      borrowingMultiplier: double.tryParse(_borrowingMultiplierController.text.trim()) ?? 3.0,
      maxCreditScoreMultiplier: double.tryParse(_maxCreditScoreController.text.trim()) ?? 1.0,
      minGuarantorsCount: int.tryParse(_minGuarantorsController.text.trim()) ?? 3,
      guarantorCapacityPct: double.tryParse(_guarantorCapacityController.text.trim()) ?? 50.0,
      processingFee: double.tryParse(_processingFeeController.text.trim()) ?? 0.0,
      sharesCountBorrowing: _sharesCountBorrowing,
      sharesCountGuarantor: _sharesCountGuarantor,
    );

    await ref.read(settingsNotifierProvider.notifier).updateLoanSettings(request);
    
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Loan settings updated successfully'), backgroundColor: AppColors.positive));
    }
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
            const Text('Eligibility Requirements', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _minSavingsController,
                    decoration: const InputDecoration(labelText: 'Minimum Savings (KES)', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid amount' : null,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _minMembershipController,
                    decoration: const InputDecoration(labelText: 'Min Membership (Months)', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (val) => val == null || int.tryParse(val) == null ? 'Invalid number' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            const Text('Borrowing Limits & Credit Score', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _borrowingMultiplierController,
                    decoration: const InputDecoration(labelText: 'Base Multiplier', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid multiplier' : null,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _maxCreditScoreController,
                    decoration: const InputDecoration(labelText: 'Max Credit Score Bonus', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid bonus' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            const Text('Guarantors', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _minGuarantorsController,
                    decoration: const InputDecoration(labelText: 'Min Guarantors', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (val) => val == null || int.tryParse(val) == null ? 'Invalid number' : null,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _guarantorCapacityController,
                    decoration: const InputDecoration(labelText: 'Guarantor Capacity (%)', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid percentage' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            const Text('Fees', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            TextFormField(
              controller: _processingFeeController,
              decoration: const InputDecoration(labelText: 'Processing Fee (KES)', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid amount' : null,
            ),
            const SizedBox(height: 32),
            const Text('Shares Policy', style: AppTextStyles.h3),
            const SizedBox(height: 8),
            SwitchListTile(
              title: const Text('Shares count towards borrowing limit'),
              value: _sharesCountBorrowing,
              onChanged: (val) => setState(() => _sharesCountBorrowing = val),
              contentPadding: EdgeInsets.zero,
            ),
            SwitchListTile(
              title: const Text('Shares count towards guarantor capacity'),
              value: _sharesCountGuarantor,
              onChanged: (val) => setState(() => _sharesCountGuarantor = val),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: isLoading ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Save Loan Settings', style: TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
