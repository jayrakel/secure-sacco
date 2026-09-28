import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/asset_dto.dart';
import '../../data/asset_providers.dart';

class ChangeAssetStatusDialog extends ConsumerStatefulWidget {
  final AssetResponse asset;

  const ChangeAssetStatusDialog({super.key, required this.asset});

  @override
  ConsumerState<ChangeAssetStatusDialog> createState() => _ChangeAssetStatusDialogState();
}

class _ChangeAssetStatusDialogState extends ConsumerState<ChangeAssetStatusDialog> {
  final _formKey = GlobalKey<FormState>();
  late AssetStatus _selectedStatus;
  final _notesController = TextEditingController();
  final _valueController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.asset.status;
  }

  @override
  void dispose() {
    _notesController.dispose();
    _valueController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedStatus == widget.asset.status) {
        Navigator.pop(context); // No change
        return;
      }

      final request = UpdateAssetStatusRequest(
        newStatus: _selectedStatus.name,
        disposalNotes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        disposalValue: _valueController.text.trim().isEmpty ? null : double.parse(_valueController.text.trim()),
      );

      final success = await ref.read(assetControllerProvider.notifier).updateAssetStatus(widget.asset.id, request);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Asset status updated successfully')),
        );
        ref.invalidate(assetDetailProvider(widget.asset.id));
        ref.invalidate(assetsProvider);
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isTerminal = _selectedStatus.isTerminal;
    final isDisposed = _selectedStatus == AssetStatus.DISPOSED;
    final state = ref.watch(assetControllerProvider);

    return AlertDialog(
      title: const Text('Change Asset Status'),
      content: state.isLoading
          ? const SizedBox(
              height: 100,
              child: Center(child: CircularProgressIndicator()),
            )
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (state.hasError)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: Text(
                          state.error.toString(),
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                      ),
                    DropdownButtonFormField<AssetStatus>(
                      value: _selectedStatus,
                      decoration: const InputDecoration(
                        labelText: 'New Status',
                        border: OutlineInputBorder(),
                      ),
                      items: AssetStatus.values.map((status) {
                        return DropdownMenuItem(
                          value: status,
                          child: Text(status.name.replaceAll('_', ' ')),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedStatus = val;
                            if (!val.isTerminal) {
                              _notesController.clear();
                              _valueController.clear();
                            }
                          });
                        }
                      },
                    ),
                    if (isTerminal) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _notesController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Disposal/Write-off Notes',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) => value == null || value.isEmpty ? 'Required for terminal states' : null,
                      ),
                    ],
                    if (isDisposed) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _valueController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Disposal Value',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.attach_money),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Required when disposed';
                          final val = double.tryParse(value);
                          if (val == null || val < 0) return 'Must be a valid positive number or 0';
                          return null;
                        },
                      ),
                    ],
                    if (isTerminal)
                      Padding(
                        padding: const EdgeInsets.only(top: 16.0),
                        child: Text(
                          'Warning: Terminal states are irreversible. You will not be able to update this asset further.',
                          style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12),
                        ),
                      ),
                  ],
                ),
              ),
            ),
      actions: state.isLoading
          ? null
          : [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: _submit,
                child: const Text('Update'),
              ),
            ],
    );
  }
}
