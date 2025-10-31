import argparse
import sys
import app

def create_parser():
    parser = argparse.ArgumentParser(
        description="The TigerTunity application"
    )
    parser.add_argument("port",
                        type=int,
                        help="the port at which the server should"
                        +" listen")
    return parser

def print_error(ex):
    print(f"{sys.argv[0]}:", ex, file=sys.stderr)

def main():
    parser = create_parser()
    args = parser.parse_args()

    try:
        app.app.run(host='0.0.0.0', port=args.port, debug=True)
    except Exception as ex:
        print_error(ex)
        sys.exit(1)

if __name__ == "__main__":
    main()