import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/payment_product_dto.dart';
import '../../data/payment_product_providers.dart';
import '../../data/payment_product_repository.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class MemberSplitDepositScreen extends ConsumerStatefulWidget {
  const MemberSplitDepositScreen({super.key});

  @override
  ConsumerState<MemberSplitDepositScreen> createState() => _MemberSplitDepositScreenState();
}

class _MemberSplitDepositScreenState extends ConsumerState<MemberSplitDepositScreen> {
  final _formKey = GlobalKey<FormState>();
  final _totalAmountController = TextEditingController();
  final _phoneController = TextEditingController();

  final Map<String, TextEditingController> _allocationControllers = {};
  bool _isLoading = false;
  String? _validationError;

  @override
  void dispose() {
    _totalAmountController.dispose();
    _phoneController.dispose();
    for (var controller in _allocationControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _calculateAllocations(List<ProductAllocationContext> contextList) {
    if (_totalAmountController.text.isEmpty) return;
    final total = double.tryParse(_totalAmountController.text) ?? 0.0;
    if (total <= 0) return;

    double remaining = total;
    
    // Reset all
    for (var controller in _allocationControllers.values) {
      controller.text = '';
    }

    // 1. Mandatory/Capped (e.g., Penalties, Loan Repayments)
    for (var ctx in contextList) {
      if (ctx.isCapped && ctx.outstandingAmount != null && ctx.outstandingAmount! > 0) {
        if (remaining <= 0) break;
        double allocate = remaining < ctx.outstandingAmount! ? remaining : ctx.outstandingAmount!;
        _allocationControllers[ctx.productId]!.text = allocate.toStringAsFixed(2);
        remaining -= allocate;
      }
    }

    // 2. Uncapped (e.g., Savings, Shares) - distribute remaining equally, or just put all in Savings
    if (remaining > 0) {
      final uncapped = contextList.where((c) => !c.isCapped).toList();
      if (uncapped.isNotEmpty) {
        // Just dump the rest in the first uncapped (typically Savings)
        _allocationControllers[uncapped.first.productId]!.text = remaining.toStringAsFixed(2);
      }
    }
    
    setState(() {});
  }

  Future<void> _submit(List<ProductAllocationContext> contextList) async {
    if (!_formKey.currentState!.validate()) return;
    
    final total = double.tryParse(_totalAmountController.text) ?? 0.0;
    if (total <= 0) return;

    List<AllocationLine> allocations = [];
    double allocatedTotal = 0;

    for (var ctx in contextList) {
      final text = _allocationControllers[ctx.productId]?.text ?? '';
      if (text.isNotEmpty) {
        final amount = double.tryParse(text) ?? 0.0;
        if (amount > 0) {
          allocations.add(AllocationLine(productId: ctx.productId, amount: amount));
          allocatedTotal += amount;
        }
      }
    }

    if (allocatedTotal != total) {
      setState(() => _validationError = 'Total allocated ($allocatedTotal) must equal Total Amount ($total)');
      return;
    }

    setState(() {
      _isLoading = true;
      _validationError = null;
    });

    try {
      final repository = ref.read(paymentProductRepositoryProvider);
      
      // Validate
      final valRes = await repository.validateAllocation(ValidateAllocationRequest(totalAmount: total, allocations: allocations));
      if (!valRes.valid) {
        setState(() => _validationError = valRes.errorMessage ?? valRes.fieldErrors.join('\n'));
        return;
      }

      // Initiate
      await repository.initiateSplitDeposit(InitiateSplitDepositRequest(
        totalAmount: total,
        phoneNumber: _phoneController.text,
        allocations: allocations,
      ));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Deposit Initiated. Please check your phone.')),
        );
        ref.invalidate(recentSplitDepositsProvider);
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _validationError = 'Failed: $e');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final contextAsync = ref.watch(allocationContextProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Make Deposit', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: contextAsync.when(
        data: (contextList) {
          // Initialize controllers
          for (var ctx in contextList) {
            _allocationControllers.putIfAbsent(ctx.productId, () => TextEditingController());
          }
          return _buildForm(contextList);
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(allocationContextProvider)),
      ),
    );
  }

  Widget _buildForm(List<ProductAllocationContext> contextList) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_validationError != null)
              Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.negative.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.negative.withValues(alpha: 0.5)),
                ),
                child: Text(_validationError!, style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative)),
              ),
              
            _buildLabel('M-Pesa Phone Number'),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: _inputDecoration('e.g. 254700000000'),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: AppSpacing.md),

            _buildLabel('Total Deposit Amount'),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _totalAmountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: _inputDecoration('Total amount (KES)'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                ElevatedButton(
                  onPressed: () => _calculateAllocations(contextList),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                    foregroundColor: AppColors.primary,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
                  ),
                  child: const Text('Auto-Split'),
                ),
              ],
            ),
            
            const SizedBox(height: AppSpacing.xl),
            Text('Allocations', style: AppTextStyles.h3),
            const SizedBox(height: AppSpacing.sm),
            
            ...contextList.map((ctx) => _buildAllocationLine(ctx)),

            const SizedBox(height: AppSpacing.xxl),
            ElevatedButton(
              onPressed: _isLoading ? null : () => _submit(contextList),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(color: AppColors.surface, strokeWidth: 2),
                    )
                  : Text('Initiate Payment', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAllocationLine(ProductAllocationContext ctx) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(ctx.productName, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                if (ctx.outstandingAmount != null && ctx.outstandingAmount! > 0)
                  Text('Owes: ${ctx.outstandingAmount}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative)),
                if (ctx.isCapped)
                  Text('Capped', style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary, fontSize: 10)),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: TextFormField(
              controller: _allocationControllers[ctx.productId],
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.right,
              decoration: _inputDecoration('0.00'),
              onChanged: (_) => setState(() => _validationError = null),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Text(text, style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w600)),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary.withValues(alpha: 0.5)),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: AppColors.textSecondary.withValues(alpha: 0.2)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: AppColors.textSecondary.withValues(alpha: 0.2)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.primary),
      ),
    );
  }
}
