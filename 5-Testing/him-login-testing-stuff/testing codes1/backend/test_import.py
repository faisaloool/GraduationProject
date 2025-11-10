try:
    import security
    print("Import successful")
    print("Available attributes:", [x for x in dir(security) if not x.startswith('_')])
    if hasattr(security, 'hash_password'):
        print("hash_password found!")
    else:
        print("hash_password NOT found!")
except Exception as e:
    import traceback
    print(f"Error: {type(e).__name__}: {e}")
    traceback.print_exc()
