import argparse

def main():
    parser = argparse.ArgumentParser(description="Job Worker")
    parser.add_argument("--deadline", type=int, default=60, help="Job deadline in seconds")
    args = parser.parse_args()
    print(f"Running with deadline {args.deadline}")

if __name__ == "__main__":
    main()
