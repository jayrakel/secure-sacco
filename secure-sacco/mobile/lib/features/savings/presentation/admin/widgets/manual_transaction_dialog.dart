import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_spacing.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/savings_dto.dart';
import '../../../data/savings_providers.dart';

class ManualTransactionDialog extends ConsumerStatefulWidget {
  final String memberId;
  final bool isDeposit;

  const ManualTransactionDialog({
    super.key,
    required this.memberId,
    required this.isDeposit,
  });

  @override
  ConsumerState<ManualTransactionDialog> createState() => _ManualTransactionDialogState();
}

class _ManualTransactionDialogState extends ConsumerState<ManualTransactionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _extRefController = TextEditingController();
  final _notesController = TextEditingController();

  String _channel = 'CASH';
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _bankNameController.dispose();
    _extRefController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final req = ManualTransactionRequest(
        memberId: widget.memberId,
        amount: double.parse(_amountController.text),
        channel: _channel,
        bankName: _channel == 'BANK_TRANSFER' ? _bankNameController.text : null,
        externalReference: _extRefController.text.isNotEmpty ? _extRefController.text : null,
        referenceNotes: _notesController.text.isNotEmpty ? _notesController.text : null,
      );

      final notifier = ref.read(savingsNotifierProvider);
      if (widget.isDeposit) {
        await notifier.submitManualDeposit(req);
      } else {
        await notifier.submitManualWithdrawal(req);
      }

      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Transaction successful')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  widget.isDeposit ? 'Receive Cash Deposit' : 'Payout Cash Withdrawal',
                  style: AppTextStyles.h3,
                ),
                const SizedBox(height: AppSpacing.md),
                if (_error != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.md),
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    color: AppColors.negative.withValues(alpha: 0.1),
                    child: Text(_error!, style: const TextStyle(color: AppColors.negative)),
                  ),
                
                TextFormField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount (KES)', border: OutlineInputBorder()),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (double.tryParse(v) == null || double.parse(v) <= 0) return 'Invalid amount';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),

                DropdownButtonFormField<String>(
                  initialValue: _channel,
                  decoration: const InputDecoration(labelText: 'Channel', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'CASH', child: Text('CASH')),
                    DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('BANK TRANSFER')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _channel = val);
                  },
                ),
                const SizedBox(height: AppSpacing.md),

                if (_channel == 'BANK_TRANSFER')
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: TextFormField(
                      controller: _bankNameController,
                      decoration: const InputDecoration(labelText: 'Bank Name', border: OutlineInputBorder()),
                      validator: (v) => v == null || v.isEmpty ? 'Required for bank transfers' : null,
                    ),
                  ),

                TextFormField(
                  controller: _extRefController,
                  decoration: const InputDecoration(labelText: 'External Reference (e.g., Receipt No)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: AppSpacing.md),

                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(labelText: 'Notes (Optional)', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
                const SizedBox(height: AppSpacing.xl),

                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isLoading ? null : () => context.pop(),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: widget.isDeposit ? AppColors.positive : AppColors.negative,
                        foregroundColor: AppColors.surface,
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: AppColors.surface, strokeWidth: 2))
                          : Text('Submit Transaction'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
