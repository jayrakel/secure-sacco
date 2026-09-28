import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/payment_product_dto.dart';
import '../../data/payment_product_providers.dart';
import '../../data/payment_product_repository.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../accounting/data/accounting_providers.dart';

class CreatePaymentProductScreen extends ConsumerStatefulWidget {
  const CreatePaymentProductScreen({super.key});

  @override
  ConsumerState<CreatePaymentProductScreen> createState() => _CreatePaymentProductScreenState();
}

class _CreatePaymentProductScreenState extends ConsumerState<CreatePaymentProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _glAccountIdController = TextEditingController();
  final _displayOrderController = TextEditingController(text: '0');
  final _requiredAmountController = TextEditingController();

  ModuleType _selectedModuleType = ModuleType.CUSTOM;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _glAccountIdController.dispose();
    _displayOrderController.dispose();
    _requiredAmountController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final request = CreateProductRequest(
        name: _nameController.text,
        code: _codeController.text,
        description: _descriptionController.text.isNotEmpty ? _descriptionController.text : null,
        moduleType: _selectedModuleType,
        glAccountId: _glAccountIdController.text,
        displayOrder: int.tryParse(_displayOrderController.text) ?? 0,
        requiredAmount: _requiredAmountController.text.isNotEmpty ? double.tryParse(_requiredAmountController.text) : null,
      );

      final repository = ref.read(paymentProductRepositoryProvider);
      await repository.createProduct(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment Product Created')),
        );
        ref.invalidate(paymentProductsProvider);
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create product: $e'), backgroundColor: AppColors.negative),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('New Payment Product', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildLabel('Product Name'),
              TextFormField(
                controller: _nameController,
                decoration: _inputDecoration('e.g. December Party Fund'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: AppSpacing.md),

              _buildLabel('Product Code'),
              TextFormField(
                controller: _codeController,
                decoration: _inputDecoration('e.g. PARTY-FUND'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: AppSpacing.md),

              _buildLabel('Module Type'),
              DropdownButtonFormField<ModuleType>(
                value: _selectedModuleType,
                decoration: _inputDecoration('Select Type'),
                items: ModuleType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(type.name, style: AppTextStyles.bodyMedium),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedModuleType = val);
                },
              ),
              const SizedBox(height: AppSpacing.md),

              _buildLabel('GL Account to Credit'),
              ref.watch(accountsProvider).when(
                data: (accounts) {
                  final activeAccounts = accounts.where((a) => a.isActive).toList();
                  return DropdownButtonFormField<String>(
                    value: _glAccountIdController.text.isNotEmpty ? _glAccountIdController.text : null,
                    decoration: _inputDecoration('Select account...'),
                    items: activeAccounts.map((a) {
                      return DropdownMenuItem(
                        value: a.id,
                        child: Text('${a.accountCode} - ${a.accountName}', style: AppTextStyles.bodyMedium),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _glAccountIdController.text = val);
                    },
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, s) => Text('Error loading accounts', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.negative)),
              ),
              const SizedBox(height: AppSpacing.md),

              _buildLabel('Description (Optional)'),
              TextFormField(
                controller: _descriptionController,
                decoration: _inputDecoration('Brief description...'),
                maxLines: 2,
              ),
              const SizedBox(height: AppSpacing.md),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Display Order'),
                        TextFormField(
                          controller: _displayOrderController,
                          keyboardType: TextInputType.number,
                          decoration: _inputDecoration('0'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('Target Amount (Optional)'),
                        TextFormField(
                          controller: _requiredAmountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: _inputDecoration('e.g. 5000'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),

              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
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
                    : Text('Create Product', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.surface, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
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
