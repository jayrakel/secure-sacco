import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/penalty_dto.dart';
import '../../data/penalty_providers.dart';

class CreateEditPenaltyRuleScreen extends ConsumerStatefulWidget {
  final PenaltyRule? rule;
  
  const CreateEditPenaltyRuleScreen({super.key, this.rule});

  @override
  ConsumerState<CreateEditPenaltyRuleScreen> createState() => _CreateEditPenaltyRuleScreenState();
}

class _CreateEditPenaltyRuleScreenState extends ConsumerState<CreateEditPenaltyRuleScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _codeController;
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late TextEditingController _baseAmountValueController;
  late TextEditingController _gracePeriodDaysController;
  late TextEditingController _interestPeriodDaysController;
  late TextEditingController _interestRateController;
  
  String _baseAmountType = 'FIXED';
  String _interestMode = 'NONE';
  bool _isActive = true;
  
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.rule?.code ?? '');
    _nameController = TextEditingController(text: widget.rule?.name ?? '');
    _descriptionController = TextEditingController(text: widget.rule?.description ?? '');
    _baseAmountValueController = TextEditingController(text: widget.rule?.baseAmountValue.toString() ?? '');
    _gracePeriodDaysController = TextEditingController(text: widget.rule?.gracePeriodDays.toString() ?? '0');
    _interestPeriodDaysController = TextEditingController(text: widget.rule?.interestPeriodDays.toString() ?? '0');
    _interestRateController = TextEditingController(text: widget.rule?.interestRate.toString() ?? '0.0');
    
    if (widget.rule != null) {
      _baseAmountType = widget.rule!.baseAmountType;
      _interestMode = widget.rule!.interestMode;
      _isActive = widget.rule!.isActive;
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _baseAmountValueController.dispose();
    _gracePeriodDaysController.dispose();
    _interestPeriodDaysController.dispose();
    _interestRateController.dispose();
    super.dispose();
  }
  
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final req = PenaltyRuleRequest(
        code: _codeController.text.trim(),
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
        baseAmountType: _baseAmountType,
        baseAmountValue: double.parse(_baseAmountValueController.text),
        gracePeriodDays: int.parse(_gracePeriodDaysController.text),
        interestPeriodDays: int.parse(_interestPeriodDaysController.text),
        interestRate: double.parse(_interestRateController.text),
        interestMode: _interestMode,
        isActive: _isActive,
      );
      
      final repo = ref.read(penaltyRepositoryProvider);
      if (widget.rule == null) {
        await repo.createRule(req);
      } else {
        await repo.updateRule(widget.rule!.id, req);
      }
      
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.rule == null ? 'Rule created successfully' : 'Rule updated successfully')),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to save rule: ${e.toString()}';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.rule == null ? 'Create Penalty Rule' : 'Edit Penalty Rule'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                color: AppColors.negative.withOpacity(0.1),
                child: Text(_error!, style: const TextStyle(color: AppColors.negative)),
              ),
              
            TextFormField(
              controller: _codeController,
              decoration: const InputDecoration(labelText: 'Code (e.g. LATE_PAYMENT)', border: OutlineInputBorder()),
              validator: (v) => v!.isEmpty ? 'Required' : null,
              enabled: widget.rule == null, // Code shouldn't change after creation usually
            ),
            const SizedBox(height: AppSpacing.md),
            
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: AppSpacing.md),
            
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description (Optional)', border: OutlineInputBorder()),
              maxLines: 2,
            ),
            const SizedBox(height: AppSpacing.md),
            
            DropdownButtonFormField<String>(
              value: _baseAmountType,
              decoration: const InputDecoration(labelText: 'Base Amount Type', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'FIXED', child: Text('Fixed Amount')),
                DropdownMenuItem(value: 'PERCENTAGE', child: Text('Percentage of Reference')),
              ],
              onChanged: (v) => setState(() => _baseAmountType = v!),
            ),
            const SizedBox(height: AppSpacing.md),
            
            TextFormField(
              controller: _baseAmountValueController,
              decoration: const InputDecoration(labelText: 'Base Amount Value', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) => v!.isEmpty || double.tryParse(v) == null ? 'Invalid amount' : null,
            ),
            const SizedBox(height: AppSpacing.md),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _gracePeriodDaysController,
                    decoration: const InputDecoration(labelText: 'Grace Period (Days)', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (v) => v!.isEmpty || int.tryParse(v) == null ? 'Invalid number' : null,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: TextFormField(
                    controller: _interestPeriodDaysController,
                    decoration: const InputDecoration(labelText: 'Interest Period (Days)', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (v) => v!.isEmpty || int.tryParse(v) == null ? 'Invalid number' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            
            DropdownButtonFormField<String>(
              value: _interestMode,
              decoration: const InputDecoration(labelText: 'Interest Mode', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'NONE', child: Text('None')),
                DropdownMenuItem(value: 'SIMPLE', child: Text('Simple Interest')),
                DropdownMenuItem(value: 'COMPOUND', child: Text('Compound Interest')),
              ],
              onChanged: (v) => setState(() => _interestMode = v!),
            ),
            const SizedBox(height: AppSpacing.md),
            
            if (_interestMode != 'NONE')
              TextFormField(
                controller: _interestRateController,
                decoration: const InputDecoration(labelText: 'Interest Rate (%)', border: OutlineInputBorder()),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (v) => v!.isEmpty || double.tryParse(v) == null ? 'Invalid rate' : null,
              ),
              
            const SizedBox(height: AppSpacing.md),
            SwitchListTile(
              title: const Text('Is Active'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
              contentPadding: EdgeInsets.zero,
            ),
            
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: _isLoading ? null : _save,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppColors.primary,
              ),
              child: _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Save Rule', style: TextStyle(color: Colors.white, fontSize: 16)),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}
