import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/loan_dto.dart';
import '../../data/loan_providers.dart';

class CreateEditLoanProductScreen extends ConsumerStatefulWidget {
  final LoanProduct? existingProduct;

  const CreateEditLoanProductScreen({super.key, this.existingProduct});

  @override
  ConsumerState<CreateEditLoanProductScreen> createState() => _CreateEditLoanProductScreenState();
}

class _CreateEditLoanProductScreenState extends ConsumerState<CreateEditLoanProductScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late final TextEditingController _nameController;
  late final TextEditingController _descController;
  late final TextEditingController _termController;
  late final TextEditingController _rateController;
  late final TextEditingController _feeController;
  late final TextEditingController _graceController;
  late final TextEditingController _minAmountController;
  late final TextEditingController _maxAmountController;
  
  String _repaymentFreq = 'MONTHLY';
  String _interestModel = 'FLAT_RATE';
  bool _isActive = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final p = widget.existingProduct;
    _nameController = TextEditingController(text: p?.name);
    _descController = TextEditingController(text: p?.description);
    _termController = TextEditingController(text: p?.termWeeks.toString());
    _rateController = TextEditingController(text: p?.interestRate.toString());
    _feeController = TextEditingController(text: p?.applicationFee.toString());
    _graceController = TextEditingController(text: p?.gracePeriodDays.toString());
    _minAmountController = TextEditingController(text: p?.minAmount?.toString());
    _maxAmountController = TextEditingController(text: p?.maxAmount?.toString());
    
    if (p != null) {
      _repaymentFreq = p.repaymentFrequency;
      _interestModel = p.interestModel;
      _isActive = p.isActive;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _termController.dispose();
    _rateController.dispose();
    _feeController.dispose();
    _graceController.dispose();
    _minAmountController.dispose();
    _maxAmountController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSubmitting = true);
    
    try {
      final request = LoanProductRequest(
        name: _nameController.text,
        description: _descController.text,
        repaymentFrequency: _repaymentFreq,
        termWeeks: int.parse(_termController.text),
        interestModel: _interestModel,
        interestRate: double.parse(_rateController.text),
        applicationFee: double.parse(_feeController.text),
        gracePeriodDays: int.parse(_graceController.text),
        isActive: _isActive,
        minAmount: _minAmountController.text.isNotEmpty ? double.parse(_minAmountController.text) : null,
        maxAmount: _maxAmountController.text.isNotEmpty ? double.parse(_maxAmountController.text) : null,
      );

      final repo = ref.read(loanRepositoryProvider);
      
      if (widget.existingProduct != null) {
        await repo.updateProduct(widget.existingProduct!.id, request);
      } else {
        await repo.createProduct(request);
      }

      if (mounted) {
        ref.invalidate(allLoanProductsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.existingProduct != null ? 'Product updated' : 'Product created')),
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
    final isEditing = widget.existingProduct != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Product' : 'Create Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Product Name', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                maxLines: 2,
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _repaymentFreq,
                      decoration: const InputDecoration(labelText: 'Repayment Freq', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'WEEKLY', child: Text('Weekly')),
                        DropdownMenuItem(value: 'BIWEEKLY', child: Text('Biweekly')),
                        DropdownMenuItem(value: 'MONTHLY', child: Text('Monthly')),
                      ],
                      onChanged: (val) => setState(() => _repaymentFreq = val!),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _termController,
                      decoration: const InputDecoration(labelText: 'Term (Weeks)', border: OutlineInputBorder()),
                      keyboardType: TextInputType.number,
                      validator: (val) => (val == null || int.tryParse(val) == null) ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _interestModel,
                      decoration: const InputDecoration(labelText: 'Interest Model', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'FLAT_RATE', child: Text('Flat Rate')),
                        DropdownMenuItem(value: 'REDUCING_BALANCE', child: Text('Reducing Balance')),
                      ],
                      onChanged: (val) => setState(() => _interestModel = val!),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _rateController,
                      decoration: const InputDecoration(labelText: 'Interest Rate (%)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (val) => (val == null || double.tryParse(val) == null) ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _feeController,
                      decoration: const InputDecoration(labelText: 'Application Fee', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (val) => (val == null || double.tryParse(val) == null) ? 'Invalid' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _graceController,
                      decoration: const InputDecoration(labelText: 'Grace Period (Days)', border: OutlineInputBorder()),
                      keyboardType: TextInputType.number,
                      validator: (val) => (val == null || int.tryParse(val) == null) ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _minAmountController,
                      decoration: const InputDecoration(labelText: 'Min Amount (Opt)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _maxAmountController,
                      decoration: const InputDecoration(labelText: 'Max Amount (Opt)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Active'),
                value: _isActive,
                onChanged: (val) => setState(() => _isActive = val),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: _isSubmitting
                    ? const CircularProgressIndicator()
                    : Text(isEditing ? 'Save Changes' : 'Create Product'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
