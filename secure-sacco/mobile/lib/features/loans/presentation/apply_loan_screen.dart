import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../data/loan_dto.dart';
import '../data/loan_providers.dart';

class ApplyLoanScreen extends ConsumerStatefulWidget {
  const ApplyLoanScreen({super.key});

  @override
  ConsumerState<ApplyLoanScreen> createState() => _ApplyLoanScreenState();
}

class _ApplyLoanScreenState extends ConsumerState<ApplyLoanScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedProductId;
  final _principalController = TextEditingController();
  final _purposeController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _principalController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedProductId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a loan product.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(loanRepositoryProvider);
      final principal = double.parse(_principalController.text);
      await repo.createApplication(
        CreateApplicationRequest(
          productId: _selectedProductId!,
          principalAmount: principal,
          purpose: _purposeController.text,
        ),
      );

      if (mounted) {
        ref.invalidate(myLoanApplicationsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Loan application submitted successfully!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(activeLoanProductsProvider);
    final eligibilityAsync = ref.watch(loanEligibilityProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply for Loan'),
      ),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed to load products: $err')),
        data: (products) {
          if (products.isEmpty) {
            return const Center(child: Text('No active loan products available.'));
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Select Loan Product',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedProductId,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    items: products.map((product) {
                      return DropdownMenuItem<String>(
                        value: product.id,
                        child: Text(product.name),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedProductId = val;
                      });
                    },
                    validator: (value) => value == null ? 'Required' : null,
                  ),
                  if (_selectedProductId != null) ...[
                    const SizedBox(height: 16),
                    _buildProductDetailsCard(
                        products.firstWhere((p) => p.id == _selectedProductId)),
                  ],
                  const SizedBox(height: 24),
                  const Text(
                    'Principal Amount (KES)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _principalController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      prefixText: 'KES ',
                    ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Required';
                        final amount = double.tryParse(val);
                        if (amount == null || amount <= 0) return 'Invalid amount';

                        // Check dynamic max borrowing limit from eligibility
                        final currentEligibility = eligibilityAsync.asData?.value;
                        if (currentEligibility != null && amount > currentEligibility.maxBorrowingLimit) {
                          return 'Exceeds max borrowing limit of ${NumberFormat.currency(symbol: '').format(currentEligibility.maxBorrowingLimit)}';
                        }

                        if (_selectedProductId != null) {
                          final product = products.firstWhere((p) => p.id == _selectedProductId);
                          if (product.minAmount != null && amount < product.minAmount!) {
                            return 'Minimum amount is ${NumberFormat.currency(symbol: '').format(product.minAmount)}';
                          }
                          if (product.maxAmount != null && amount > product.maxAmount!) {
                            return 'Maximum amount is ${NumberFormat.currency(symbol: '').format(product.maxAmount)}';
                          }
                        }
                        return null;
                      },
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Purpose of Loan',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _purposeController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: 'Describe what the loan is for...',
                    ),
                    validator: (val) => (val == null || val.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isSubmitting
                        ? const CircularProgressIndicator()
                        : const Text('Submit Application'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductDetailsCard(LoanProduct product) {
    return Card(
      color: Colors.blue.shade50,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.blue.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              product.description,
              style: TextStyle(color: Colors.blue.shade900),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoColumn('Interest Rate', '${product.interestRate}%'),
                _buildInfoColumn('Term (Weeks)', '${product.termWeeks}'),
                _buildInfoColumn('App Fee', 'KES ${product.applicationFee}'),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildInfoColumn(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.blue.shade700, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: Colors.blue.shade900,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }
}
