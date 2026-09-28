import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';

class MyNotifier extends AutoDisposeAsyncNotifier<void> {
  @override
  FutureOr<void> build() {}

  void test() {
    state = const AsyncLoading();
    print(ref);
  }
}

class MyStateNotifier extends StateNotifier<AsyncValue<void>> {
  MyStateNotifier() : super(const AsyncValue.data(null));
  void test() {
    state = const AsyncValue.loading();
  }
}
