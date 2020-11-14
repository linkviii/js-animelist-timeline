from pathlib import Path
import sys
from bs4 import BeautifulSoup 


def main():
    if len(sys.argv) != 2:
        print("asdf")
        sys.exit(1)
    filename = Path(sys.argv[1])

    soup = BeautifulSoup(filename.read_text(), "html5lib")

    label_list = soup.find_all("label")

    for label in label_list:
        inp = label.find("input")
        if not inp:
            continue

        label["for"] = inp["id"]
        ch = label.findChildren()
        for c in ch:
            label.insert_after(c.extract())
        label.string = label.text.strip()


    # out = soup.prettify()
    out = soup.encode(formatter="html5").decode("utf8")

    print(out)


main()